// ── Dev Center-middleware ──
// Kanonisk kopi — distribueres som src/devcenter.ts i hver backend-tjeneste.
//
// Bruk:
//   initDevCenter('sales-core');
//   app.use(requestLogger());
//   app.use(errorReporter());
//
// Utgående kall: fetch(url, { headers: { ...correlationHeaders() } })

import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

interface DevCenterEntry {
  ts: number;
  type: 'request' | 'error';
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  correlationId?: string;
  message?: string;
  stack?: string;
  requestBody?: string;
  meta?: string;
}

const CORRELATION_HEADER = 'x-correlation-id';
const MAX_BUFFER = 500;
const FLUSH_INTERVAL_MS = 5000;
const MAX_BODY_CHARS = 3000;

const als = new AsyncLocalStorage<{ correlationId: string }>();

let serviceName = 'unknown';
let devCenterUrl: string | undefined;
let devCenterIngestKey: string | undefined;
let buffer: DevCenterEntry[] = [];
let flushTimer: NodeJS.Timeout | undefined;

export function initDevCenter(name: string): void {
  serviceName = name;
  devCenterUrl = process.env.DEVCENTER_DISABLED === 'true' ? undefined : process.env.DEVCENTER_URL;
  devCenterIngestKey = process.env.DEVCENTER_INGEST_KEY;
  if (!devCenterUrl) return;

  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  flushTimer.unref();
}

function enqueue(entry: DevCenterEntry): void {
  if (!devCenterUrl) return;
  buffer.push(entry);
  if (buffer.length >= MAX_BUFFER) void flush();
}

async function flush(): Promise<void> {
  if (!devCenterUrl || buffer.length === 0) return;
  const batch = buffer;
  buffer = [];
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (devCenterIngestKey) headers['x-ingest-key'] = devCenterIngestKey;

    await fetch(`${devCenterUrl.replace(/\/$/, '')}/ingest`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ service: serviceName, entries: batch }),
    });
  } catch {
    buffer = batch.slice(-100).concat(buffer).slice(-MAX_BUFFER);
  }
}

export function getCorrelationId(): string | undefined {
  return als.getStore()?.correlationId;
}

export function correlationHeaders(): Record<string, string> {
  const id = getCorrelationId();
  return id ? { [CORRELATION_HEADER]: id } : {};
}

function safeStringify(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  try {
    const s = typeof value === 'string' ? value : JSON.stringify(value);
    if (!s || s === '{}') return undefined;
    return s.length > MAX_BODY_CHARS ? `${s.slice(0, MAX_BODY_CHARS)}…[truncated]` : s;
  } catch {
    return undefined;
  }
}

export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const incoming = req.header(CORRELATION_HEADER);
    const correlationId = incoming && incoming.length <= 100 ? incoming : randomUUID();
    res.setHeader(CORRELATION_HEADER, correlationId);

    const started = Date.now();

    als.run({ correlationId }, () => {
      res.on('finish', () => {
        if (req.path === '/health') return;
        enqueue({
          ts: started,
          type: 'request',
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          durationMs: Date.now() - started,
          correlationId,
          requestBody: req.method !== 'GET' ? safeStringify(req.body) : undefined,
        });
      });
      next();
    });
  };
}

export function errorReporter() {
  return (err: Error, req: Request, res: Response, next: NextFunction): void => {
    enqueue({
      ts: Date.now(),
      type: 'error',
      method: req.method,
      path: req.originalUrl,
      correlationId: getCorrelationId() ?? req.header(CORRELATION_HEADER) ?? undefined,
      message: err.message,
      stack: err.stack,
      requestBody: safeStringify(req.body),
    });
    if (res.headersSent) {
      next(err);
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  };
}

export function reportError(message: string, err?: unknown, meta?: Record<string, unknown>): void {
  const stack = err instanceof Error ? err.stack : undefined;
  enqueue({
    ts: Date.now(),
    type: 'error',
    correlationId: getCorrelationId(),
    message,
    stack,
    meta: safeStringify(meta),
  });
}

/** Kun for tester — tøm buffer og reset state. */
export function resetDevCenterForTests(): void {
  buffer = [];
  devCenterUrl = undefined;
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = undefined;
}

export async function flushDevCenterForTests(): Promise<void> {
  await flush();
}
