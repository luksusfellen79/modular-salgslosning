// ── RoutesRouter — planlegger- og feltselger-endepunkter for ruter ──
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { routeStore } from '../storage/route-store';
import { buildingStore } from '../storage/building-store';
import { visitStore } from '../storage/visit-store';
import { calculateRouteProgress } from '../logic/progress-calculator';
import { validateStartRoute, validateCompleteRoute, RouteValidationError } from '../logic/route-validator';
import { EventBus } from '../events/event-bus.interface';
import { RouteAssignment } from '../types';
import logger from '../logger';

export function createRoutesRouter(eventBus: EventBus): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response) => {
    const correlationId = (req.headers['x-correlation-id'] as string) ?? uuidv4();
    const { date, salesRepId, salesRepName, buildingIds, createdBy, notes } = req.body as Partial<RouteAssignment>;

    if (!date || !salesRepId || !salesRepName || !buildingIds || !createdBy) {
      res.status(400).json({ error: 'Mangler påkrevde felt: date, salesRepId, salesRepName, buildingIds, createdBy' });
      return;
    }

    const route: RouteAssignment = {
      id: uuidv4(),
      date,
      salesRepId,
      salesRepName,
      buildingIds,
      status: 'planned',
      createdBy,
      createdAt: new Date().toISOString(),
      notes,
    };

    routeStore.save(route);
    logger.info('route_created', { routeId: route.id, salesRepId, correlationId });
    res.status(201).json(route);
  });

  router.get('/', (req: Request, res: Response) => {
    const correlationId = (req.headers['x-correlation-id'] as string) ?? uuidv4();
    const { date, salesRepId, status } = req.query as Record<string, string | undefined>;
    logger.info('list_routes', { date, salesRepId, status, correlationId });
    res.json(routeStore.query({ date, salesRepId, status }));
  });

  router.get('/my/today', (req: Request, res: Response) => {
    const correlationId = (req.headers['x-correlation-id'] as string) ?? uuidv4();
    const salesRepId = req.query.salesRepId as string | undefined;
    if (!salesRepId) {
      res.status(400).json({ error: 'salesRepId er påkrevd' });
      return;
    }

    const today = new Date().toISOString().split('T')[0] ?? '';
    const routes = routeStore.query({ date: today, salesRepId });
    if (routes.length === 0) {
      res.status(404).json({ error: 'Ingen rute funnet for i dag' });
      return;
    }

    const route = routes[0]!;
    const buildings = buildingStore.getAll().filter((b) => route.buildingIds.includes(b.id));
    const units = buildings.flatMap((b) => buildingStore.getUnitsForBuilding(b.id));
    const visits = visitStore.getByRouteId(route.id);
    const progress = calculateRouteProgress(route, buildings, units, visits);

    logger.info('my_today_route', { routeId: route.id, salesRepId, correlationId });
    res.json({ route, progress });
  });

  router.get('/:id', (req: Request, res: Response) => {
    const correlationId = (req.headers['x-correlation-id'] as string) ?? uuidv4();
    const route = routeStore.getById(req.params.id);
    if (!route) {
      res.status(404).json({ error: 'Rute ikke funnet' });
      return;
    }
    const buildings = buildingStore.getAll().filter((b) => route.buildingIds.includes(b.id));
    const units = buildings.flatMap((b) => buildingStore.getUnitsForBuilding(b.id));
    const visits = visitStore.getByRouteId(route.id);
    const progress = calculateRouteProgress(route, buildings, units, visits);
    logger.info('get_route', { routeId: route.id, correlationId });
    res.json({ route, progress });
  });

  router.get('/:id/progress', (req: Request, res: Response) => {
    const correlationId = (req.headers['x-correlation-id'] as string) ?? uuidv4();
    const route = routeStore.getById(req.params.id);
    if (!route) {
      res.status(404).json({ error: 'Rute ikke funnet' });
      return;
    }
    const buildings = buildingStore.getAll().filter((b) => route.buildingIds.includes(b.id));
    const units = buildings.flatMap((b) => buildingStore.getUnitsForBuilding(b.id));
    const visits = visitStore.getByRouteId(route.id);
    const progress = calculateRouteProgress(route, buildings, units, visits);
    logger.info('get_route_progress', { routeId: route.id, correlationId });
    res.json(progress);
  });

  router.get('/:id/buildings/:buildingId', (req: Request, res: Response) => {
    const correlationId = (req.headers['x-correlation-id'] as string) ?? uuidv4();
    const route = routeStore.getById(req.params.id);
    if (!route) {
      res.status(404).json({ error: 'Rute ikke funnet' });
      return;
    }
    const building = buildingStore.getById(req.params.buildingId);
    if (!building) {
      res.status(404).json({ error: 'Bygg ikke funnet' });
      return;
    }
    const units = buildingStore.getUnitsForBuilding(building.id);
    const visits = visitStore.getByRouteId(route.id);
    const visitMap = new Map(visits.map((v) => [v.unitId, v]));
    const withStatus = units.map((u) => ({
      ...u,
      visitStatus: visitMap.get(u.id)?.status ?? 'not_visited',
      visit: visitMap.get(u.id),
    }));
    logger.info('get_route_building_units', { routeId: route.id, buildingId: building.id, correlationId });
    res.json(withStatus);
  });

  router.post('/:id/start', async (req: Request, res: Response) => {
    const correlationId = (req.headers['x-correlation-id'] as string) ?? uuidv4();
    const route = routeStore.getById(req.params.id);
    if (!route) {
      res.status(404).json({ error: 'Rute ikke funnet' });
      return;
    }

    const { salesRepId } = req.body as { salesRepId?: string };
    if (!salesRepId) {
      res.status(400).json({ error: 'salesRepId er påkrevd' });
      return;
    }

    try {
      validateStartRoute(route, salesRepId);
    } catch (err) {
      if (err instanceof RouteValidationError) {
        res.status(403).json({ error: err.message });
        return;
      }
      throw err;
    }

    const updated: RouteAssignment = { ...route, status: 'in_progress', startedAt: new Date().toISOString() };
    routeStore.save(updated);

    await eventBus.publish('route_started', { routeId: route.id, salesRepId, date: route.date });
    logger.info('route_started', { routeId: route.id, salesRepId, correlationId });
    res.json(updated);
  });

  router.post('/:id/complete', async (req: Request, res: Response) => {
    const correlationId = (req.headers['x-correlation-id'] as string) ?? uuidv4();
    const route = routeStore.getById(req.params.id);
    if (!route) {
      res.status(404).json({ error: 'Rute ikke funnet' });
      return;
    }

    try {
      validateCompleteRoute(route);
    } catch (err) {
      if (err instanceof RouteValidationError) {
        res.status(403).json({ error: err.message });
        return;
      }
      throw err;
    }

    const updated: RouteAssignment = { ...route, status: 'completed', completedAt: new Date().toISOString() };
    routeStore.save(updated);

    await eventBus.publish('route_completed', { routeId: route.id, salesRepId: route.salesRepId, date: route.date });
    logger.info('route_completed', { routeId: route.id, salesRepId: route.salesRepId, correlationId });
    res.json(updated);
  });

  return router;
}
