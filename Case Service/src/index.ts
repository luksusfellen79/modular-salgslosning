// ── Application entry point ──
import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import { router } from './routes/cases';
import { logger } from './logger';
import { usePostgres, useMemoryStore } from './db/pool';
import { startEventListener } from './events/eventListener';
import { startSlaMonitor } from './services/slaService';

dotenv.config();

export const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(router);

if (usePostgres()) {
  logger.info({ message: 'Case Service using PostgreSQL' });
} else if (useMemoryStore()) {
  logger.info({ message: 'Case Service using in-memory store' });
} else {
  logger.warn({ message: 'Case Service started without DATABASE_URL — set DATABASE_URL or CASE_SERVICE_MEMORY=true' });
}

export function startServer(): void {
  const port = parseInt(process.env.PORT ?? process.env.CASE_SERVICE_PORT ?? '3006', 10);

  startEventListener();
  startSlaMonitor();

  app.listen(port, () => {
    logger.info({ message: 'Case Service started', port, emailProvider: process.env.EMAIL_PROVIDER ?? 'disabled' });
  });
}

if (require.main === module) {
  startServer();
}
