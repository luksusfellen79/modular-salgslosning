// ── Spørrings-API for dashboardet ──
import { Router, Request, Response } from 'express';
import { db } from '../db';
import { getMonitoredServices } from '../health/poller';

export function createQueryRouter(): Router {
  const router = Router();

  router.get('/logs', (req: Request, res: Response) => {
    const { service, errorsOnly, search, status, before } = req.query;
    const limit = Math.min(parseInt(String(req.query.limit ?? '100'), 10) || 100, 500);

    const where: string[] = [];
    const params: Record<string, string | number> = { limit };

    if (typeof service === 'string' && service) {
      where.push('service = @service');
      params.service = service;
    }
    if (errorsOnly === 'true') {
      where.push("(type = 'error' OR status >= 400)");
    }
    if (typeof status === 'string' && status) {
      where.push('status = @status');
      params.status = parseInt(status, 10);
    }
    if (typeof search === 'string' && search) {
      where.push('(path LIKE @search OR message LIKE @search OR correlation_id LIKE @search)');
      params.search = `%${search}%`;
    }
    if (typeof before === 'string' && before) {
      where.push('id < @before');
      params.before = parseInt(before, 10);
    }

    const sql = `
      SELECT id, ts, service, type, method, path, status, duration_ms AS durationMs,
             correlation_id AS correlationId, message
      FROM logs
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY id DESC
      LIMIT @limit
    `;
    res.json({ logs: db.prepare(sql).all(params) });
  });

  router.get('/logs/:id', (req: Request, res: Response) => {
    const row = db
      .prepare(
        `SELECT id, ts, service, type, method, path, status, duration_ms AS durationMs,
                correlation_id AS correlationId, message, stack, request_body AS requestBody, meta
         FROM logs WHERE id = ?`,
      )
      .get(parseInt(req.params.id, 10));
    if (!row) {
      res.status(404).json({ error: 'Ikke funnet' });
      return;
    }
    res.json(row);
  });

  router.get('/traces/:correlationId', (req: Request, res: Response) => {
    const rows = db
      .prepare(
        `SELECT id, ts, service, type, method, path, status, duration_ms AS durationMs,
                correlation_id AS correlationId, message, stack, request_body AS requestBody
         FROM logs WHERE correlation_id = ? ORDER BY ts ASC, id ASC`,
      )
      .all(req.params.correlationId);
    res.json({ correlationId: req.params.correlationId, events: rows });
  });

  router.get('/services', (_req: Request, res: Response) => {
    const windowStart = Date.now() - 15 * 60 * 1000;

    const traffic = db
      .prepare(
        `SELECT service,
                COUNT(*) AS requests,
                SUM(CASE WHEN type = 'error' OR status >= 500 THEN 1 ELSE 0 END) AS errors,
                ROUND(AVG(duration_ms)) AS avgMs,
                MAX(ts) AS lastSeen
         FROM logs WHERE ts > ? GROUP BY service`,
      )
      .all(windowStart) as Array<{
        service: string;
        requests: number;
        errors: number;
        avgMs: number;
        lastSeen: number;
      }>;

    const trafficMap = new Map(traffic.map((t) => [t.service, t]));

    const services = getMonitoredServices().map((s) => {
      const lastCheck = db
        .prepare(
          `SELECT ts, ok, status_code AS statusCode, latency_ms AS latencyMs
           FROM health_checks WHERE service = ? ORDER BY id DESC LIMIT 1`,
        )
        .get(s.name) as { ts: number; ok: number; statusCode: number; latencyMs: number } | undefined;

      const t = trafficMap.get(s.name);
      const errorRate = t && t.requests > 0 ? t.errors / t.requests : 0;

      let health: 'green' | 'yellow' | 'red' = 'green';
      if (!lastCheck || !lastCheck.ok) health = 'red';
      else if (errorRate > 0.05) health = 'yellow';

      return {
        name: s.name,
        url: s.url,
        health,
        lastCheck: lastCheck ?? null,
        window15m: {
          requests: t?.requests ?? 0,
          errors: t?.errors ?? 0,
          errorRate: Math.round(errorRate * 1000) / 10,
          avgMs: t?.avgMs ?? null,
          lastSeen: t?.lastSeen ?? null,
        },
      };
    });

    for (const t of traffic) {
      if (!services.some((s) => s.name === t.service)) {
        services.push({
          name: t.service,
          url: '',
          health: t.requests > 0 && t.errors / t.requests > 0.05 ? 'yellow' : 'green',
          lastCheck: null,
          window15m: {
            requests: t.requests,
            errors: t.errors,
            errorRate: Math.round((t.errors / t.requests) * 1000) / 10,
            avgMs: t.avgMs,
            lastSeen: t.lastSeen,
          },
        });
      }
    }

    res.json({ services });
  });

  router.get('/alerts', (_req: Request, res: Response) => {
    const rows = db
      .prepare(
        `SELECT id, ts, service, rule, message, resolved_ts AS resolvedTs
         FROM alerts ORDER BY id DESC LIMIT 100`,
      )
      .all();
    res.json({ alerts: rows });
  });

  router.get('/stats', (_req: Request, res: Response) => {
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const stats = db
      .prepare(
        `SELECT COUNT(*) AS requestsLastHour,
                SUM(CASE WHEN type = 'error' OR status >= 500 THEN 1 ELSE 0 END) AS errorsLastHour,
                ROUND(AVG(duration_ms)) AS avgMs
         FROM logs WHERE ts > ?`,
      )
      .get(hourAgo);
    const total = db.prepare('SELECT COUNT(*) AS totalLogs FROM logs').get();
    res.json({ ...(stats as object), ...(total as object) });
  });

  return router;
}
