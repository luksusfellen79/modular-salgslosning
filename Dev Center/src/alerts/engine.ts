// ── Varslingsmotor ──
import { db } from '../db';
import { logger } from '../logger';

const THRESHOLD = parseFloat(process.env.ALERT_ERROR_THRESHOLD ?? '0.1');
const MIN_ERRORS = parseInt(process.env.ALERT_MIN_ERRORS ?? '5', 10);
const COOLDOWN_MS = parseInt(process.env.ALERT_COOLDOWN_MS ?? String(15 * 60 * 1000), 10);
const WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;

const lastAlertAt = new Map<string, number>();

const insertAlert = db.prepare(
  'INSERT INTO alerts (ts, service, rule, message) VALUES (?, ?, ?, ?)',
);

export function resetAlertStateForTests(): void {
  lastAlertAt.clear();
}

export function evaluateAlerts(service: string, now = Date.now()): void {
  const last = lastAlertAt.get(service) ?? 0;
  if (now - last < COOLDOWN_MS) return;

  const windowStart = now - 5 * 60 * 1000;
  const row = db
    .prepare(
      `SELECT COUNT(*) AS requests,
              SUM(CASE WHEN type = 'error' OR status >= 500 THEN 1 ELSE 0 END) AS errors
       FROM logs WHERE service = ? AND ts > ?`,
    )
    .get(service, windowStart) as { requests: number; errors: number };

  if (!row || row.requests === 0) return;
  const rate = row.errors / row.requests;

  if (row.errors >= MIN_ERRORS && rate >= THRESHOLD) {
    const message = `${service}: ${row.errors} feil av ${row.requests} kall siste 5 min (${Math.round(rate * 100)} %)`;
    insertAlert.run(now, service, 'error-rate', message);
    lastAlertAt.set(service, now);
    logger.warn({ message: 'Dev Center alert triggered', service, rule: 'error-rate' });

    if (WEBHOOK_URL) {
      void fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'dev-center', service, rule: 'error-rate', message, ts: now }),
      }).catch(() => {
        /* varsling skal aldri velte ingest */
      });
    }
  }
}

export function getAlertThresholds(): { threshold: number; minErrors: number; cooldownMs: number } {
  return { threshold: THRESHOLD, minErrors: MIN_ERRORS, cooldownMs: COOLDOWN_MS };
}
