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

dotenv.config();

export const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(router);

ensureSeedData();

eventBus.subscribe('offer.event', async (payload) => {
  const event = payload as OfferEvent;
  if (['viewed', 'accepted', 'declined'].includes(event.type)) {
    const notification = buildSseNotification(event);
    sseManager.broadcast(notification);
  }
});

export function startServer(): void {
  const port = parseInt(process.env.SALESCORE_PORT ?? '3005', 10);
  app.listen(port, () => {
    logger.info({ message: 'Sales Core started', port });
  });
}

if (require.main === module) {
  startServer();
}
