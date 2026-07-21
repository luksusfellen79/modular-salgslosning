// ── Dev Center — entry point ──
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';

import { pruneOldData } from './db';
import { createIngestRouter } from './api/ingest';
import { createQueryRouter } from './api/query';
import { startHealthPoller, getMonitoredServices } from './health/poller';
import { requireSuperadmin } from './auth';
import { logger } from './logger';

const PORT = parseInt(process.env.PORT ?? process.env.DEVCENTER_PORT ?? '3020', 10);
const startedAt = Date.now();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'dev-center',
    uptime: Math.round((Date.now() - startedAt) / 1000),
    monitoring: getMonitoredServices().map((s) => s.name),
  });
});

app.use('/ingest', createIngestRouter());
app.use('/api', requireSuperadmin, createQueryRouter());
app.use(requireSuperadmin, express.static(path.join(__dirname, '..', 'public')));

function startBackgroundJobs(): void {
  startHealthPoller();
  setInterval(pruneOldData, 60 * 60 * 1000).unref();
  pruneOldData();
}

if (process.env.NODE_ENV !== 'test') {
  startBackgroundJobs();
}

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info({ message: 'Dev Center started', port: PORT });
  });
}

export { app };
