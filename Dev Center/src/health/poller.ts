// ── Helse-polling ──
import { db } from '../db';
import { logger } from '../logger';

export interface MonitoredService {
  name: string;
  url: string;
}

const DEFAULT_SERVICES: MonitoredService[] = [
  { name: 'integration-layer', url: 'https://integration-layer-production.up.railway.app/health' },
  { name: 'sales-core', url: 'https://sales-core-production.up.railway.app/health' },
  { name: 'kas-core', url: 'https://kas-core-production.up.railway.app/health' },
];

let services: MonitoredService[] = DEFAULT_SERVICES;

const raw = process.env.MONITORED_SERVICES;
if (raw) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      services = parsed.filter(
        (s): s is MonitoredService =>
          typeof s === 'object'
          && s !== null
          && typeof (s as MonitoredService).name === 'string'
          && typeof (s as MonitoredService).url === 'string',
      );
    }
  } catch {
    logger.error({ message: 'MONITORED_SERVICES er ikke gyldig JSON — bruker default-liste' });
  }
}

export function getMonitoredServices(): MonitoredService[] {
  return services;
}

const insertCheck = db.prepare(
  'INSERT INTO health_checks (ts, service, ok, status_code, latency_ms) VALUES (?, ?, ?, ?, ?)',
);

async function checkOne(s: MonitoredService): Promise<void> {
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const resp = await fetch(s.url, { signal: controller.signal });
    clearTimeout(timer);
    const latency = Date.now() - started;
    insertCheck.run(Date.now(), s.name, resp.status < 400 ? 1 : 0, resp.status, latency);
  } catch {
    insertCheck.run(Date.now(), s.name, 0, null, Date.now() - started);
  }
}

const INTERVAL_MS = parseInt(process.env.HEALTH_INTERVAL_MS ?? '30000', 10);
let pollerStarted = false;

export function startHealthPoller(): void {
  if (pollerStarted || process.env.NODE_ENV === 'test') return;
  pollerStarted = true;

  const run = () => {
    for (const s of services) void checkOne(s);
  };
  run();
  setInterval(run, INTERVAL_MS).unref();
}
