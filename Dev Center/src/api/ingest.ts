// ── Ingest-API ──
import { Router, Request, Response } from 'express';
import { insertLogs, LogEntry } from '../db';
import { evaluateAlerts } from '../alerts/engine';
import { requireIngestKey } from '../middleware/ingestKey';

export function createIngestRouter(): Router {
  const router = Router();

  router.post('/', requireIngestKey, (req: Request, res: Response) => {
    const { service, entries } = req.body ?? {};

    if (typeof service !== 'string' || !Array.isArray(entries)) {
      res.status(400).json({ error: 'Forventer { service, entries[] }' });
      return;
    }

    const sanitized: LogEntry[] = entries
      .filter((e: unknown): e is Record<string, unknown> => typeof e === 'object' && e !== null)
      .slice(0, 1000)
      .map((e) => ({
        ts: typeof e.ts === 'number' ? e.ts : Date.now(),
        service,
        type: e.type === 'error' ? 'error' : 'request',
        method: typeof e.method === 'string' ? e.method : undefined,
        path: typeof e.path === 'string' ? e.path.slice(0, 500) : undefined,
        status: typeof e.status === 'number' ? e.status : undefined,
        durationMs: typeof e.durationMs === 'number' ? e.durationMs : undefined,
        correlationId: typeof e.correlationId === 'string' ? e.correlationId.slice(0, 100) : undefined,
        message: typeof e.message === 'string' ? e.message.slice(0, 2000) : undefined,
        stack: typeof e.stack === 'string' ? e.stack.slice(0, 10000) : undefined,
        requestBody: typeof e.requestBody === 'string' ? e.requestBody.slice(0, 5000) : undefined,
        meta: typeof e.meta === 'string' ? e.meta.slice(0, 5000) : undefined,
      }));

    if (sanitized.length > 0) {
      insertLogs(sanitized);
      evaluateAlerts(service);
    }

    res.json({ ingested: sanitized.length });
  });

  return router;
}
