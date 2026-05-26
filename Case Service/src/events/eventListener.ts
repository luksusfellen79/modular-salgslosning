// ── EventBus-lytter via Integration Layer SSE ──
import http from 'http';
import https from 'https';
import { logger } from '../logger';
import { createCaseFromEvent } from '../services/caseService';
import { AUTO_CREATE_TOPICS } from './topics';
import { inferCaseTypeFromEvent } from '../services/routingService';

export interface IntegrationLayerEvent {
  eventId: string;
  eventType: string;
  source: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

let reconnectTimer: NodeJS.Timeout | null = null;
let stopped = false;

function parseSseBlock(block: string): IntegrationLayerEvent | null {
  const lines = block.split('\n');
  let dataLine = '';
  for (const line of lines) {
    if (line.startsWith('data:')) dataLine = line.slice(5).trim();
  }
  if (!dataLine) return null;
  try {
    return JSON.parse(dataLine) as IntegrationLayerEvent;
  } catch {
    return null;
  }
}

async function handleEvent(event: IntegrationLayerEvent): Promise<void> {
  const shouldCreate = AUTO_CREATE_TOPICS.has(event.eventType)
    || event.payload.autoCreateCase === true
    || inferCaseTypeFromEvent(event.eventType, event.payload) !== null;

  if (!shouldCreate) return;

  try {
    const created = await createCaseFromEvent(event.eventType, event.payload, event.eventId);
    if (created) {
      logger.info({
        message: 'Auto-created case from EventBus',
        eventType: event.eventType,
        caseId: created.id,
        saksnummer: created.saksnummer,
      });
    }
  } catch (err) {
    logger.error({
      message: 'Failed to auto-create case from event',
      eventType: event.eventType,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

function connect(baseUrl: string): void {
  const url = new URL('/events/stream', baseUrl);
  const transport = url.protocol === 'https:' ? https : http;

  const req = transport.get(url, (res) => {
    if (res.statusCode !== 200) {
      logger.warn({ message: 'Event stream connect failed', status: res.statusCode });
      scheduleReconnect(baseUrl);
      return;
    }

    logger.info({ message: 'EventBus listener connected', url: url.toString() });
    let buffer = '';

    res.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';
      for (const part of parts) {
        const event = parseSseBlock(part);
        if (event) void handleEvent(event);
      }
    });

    res.on('end', () => scheduleReconnect(baseUrl));
    res.on('error', () => scheduleReconnect(baseUrl));
  });

  req.on('error', () => scheduleReconnect(baseUrl));
}

function scheduleReconnect(baseUrl: string): void {
  if (stopped) return;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => connect(baseUrl), 5000);
}

export function startEventListener(): void {
  const baseUrl = process.env.INTEGRATION_LAYER_URL;
  if (!baseUrl) {
    logger.warn({ message: 'Event listener disabled — INTEGRATION_LAYER_URL not set' });
    return;
  }
  stopped = false;
  connect(baseUrl);
}

export function stopEventListener(): void {
  stopped = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
}
