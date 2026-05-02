// ── Entry point — starter Route Planning Module ──
import 'dotenv/config';
import express from 'express';
import { InMemoryEventBus } from './events/in-memory-event-bus';
import { KafkaEventBus } from './events/kafka-event-bus';
import { EventBus } from './events/event-bus.interface';
import { createApiRouter } from './api/router';
import { seedIfEmpty } from './seed/seed-data';
import logger from './logger';

const PORT = parseInt(process.env.ROUTE_PLANNER_PORT ?? '3003', 10);
const NODE_ENV = process.env.NODE_ENV ?? 'development';

function createEventBus(): EventBus {
  if (process.env.EVENT_BUS_TYPE === 'kafka') {
    return new KafkaEventBus();
  }
  return new InMemoryEventBus();
}

const app = express();
app.use(express.json());

const eventBus = createEventBus();
app.use('/', createApiRouter(eventBus));

if (NODE_ENV === 'development') {
  seedIfEmpty();
}

app.listen(PORT, () => {
  logger.info('server_started', { port: PORT, env: NODE_ENV });
});

export { app };
