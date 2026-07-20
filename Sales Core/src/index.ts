// ── Application entry point ──
import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import { eventBus } from './events';
import { sseManager } from './events/sse-manager';
import { buildSseNotification } from './events/notification';
import { OfferEvent } from './types';
import { ensureSeedData } from './seed';
import { router } from './api/router';
import { logger } from './logger';
import { usePostgres } from './db/pool';
import { initDevCenter, requestLogger, errorReporter } from './devcenter';

dotenv.config();
initDevCenter('sales-core');

export const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(requestLogger());

const seedReady = ensureSeedData().catch((err) => {
  logger.error({ message: 'Seed initialization failed', error: String(err) });
  throw err;
});

export async function waitForReady(): Promise<void> {
  await seedReady;
}

app.use(async (_req, _res, next) => {
  try {
    await seedReady;
    next();
  } catch (err) {
    next(err);
  }
});

app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return next(err);
  res.status(503).json({ error: 'Service unavailable', message: err.message });
});

app.use(router);
app.use(errorReporter());

if (usePostgres()) {
  logger.info({ message: 'Sales Core using PostgreSQL storage' });
}

eventBus.subscribe('offer.event', async (payload) => {
  const event = payload as OfferEvent;
  if (['viewed', 'accepted', 'declined'].includes(event.type)) {
    const notification = buildSseNotification(event);
    sseManager.broadcast(notification);
  }
});

export function startServer(): void {
  const port = parseInt(process.env.PORT ?? process.env.SALESCORE_PORT ?? '3005', 10);
  app.listen(port, () => {
    logger.info({ message: 'Sales Core started', port });
  });
}

if (require.main === module) {
  startServer();
}
