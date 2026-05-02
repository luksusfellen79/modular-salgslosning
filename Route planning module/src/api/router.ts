// ── Router — samler alle API-ruter ──
import { Router } from 'express';
import { EventBus } from '../events/event-bus.interface';
import buildingsRouter from './buildings.router';
import { createRoutesRouter } from './routes.router';
import { createVisitsRouter } from './visits.router';

export function createApiRouter(eventBus: EventBus): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'route-planning-module' });
  });

  router.use('/buildings', buildingsRouter);
  router.use('/routes', createRoutesRouter(eventBus));
  router.use('/visits', createVisitsRouter(eventBus));

  return router;
}
