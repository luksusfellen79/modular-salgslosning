// ── VisitsRouter — feltselger-endepunkter for besøkslogging ──
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { visitStore } from '../storage/visit-store';
import { routeStore } from '../storage/route-store';
import { buildingStore } from '../storage/building-store';
import { calculateRouteProgress } from '../logic/progress-calculator';
import { findExistingVisit } from '../logic/route-validator';
import { EventBus } from '../events/event-bus.interface';
import { Visit, VisitStatus } from '../types';
import logger from '../logger';

export function createVisitsRouter(eventBus: EventBus): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    const correlationId = (req.headers['x-correlation-id'] as string) ?? uuidv4();
    const { unitId, buildingId, routeId, salesRepId, status, notes, interestedProducts, followUpDate } =
      req.body as Partial<Visit>;

    if (!unitId || !buildingId || !routeId || !salesRepId || !status) {
      res.status(400).json({ error: 'Mangler påkrevde felt: unitId, buildingId, routeId, salesRepId, status' });
      return;
    }

    const allVisits = visitStore.getAll();
    const existing = findExistingVisit(allVisits, routeId, unitId);
    if (existing) {
      logger.info('visit_duplicate_returned', { visitId: existing.id, routeId, unitId, correlationId });
      res.status(200).json(existing);
      return;
    }

    const visit: Visit = {
      id: uuidv4(),
      unitId,
      buildingId,
      routeId,
      salesRepId,
      visitedAt: new Date().toISOString(),
      status,
      notes,
      interestedProducts,
      followUpDate,
    };

    visitStore.save(visit);
    logger.info('visit_logged', { visitId: visit.id, status, routeId, unitId, correlationId });

    await eventBus.publish('visit_logged', { visitId: visit.id, routeId, unitId, salesRepId, status });

    if (status === 'interested') {
      await eventBus.publish('sale_interest_registered', {
        routeId,
        unitId,
        salesRepId,
        interestedProducts: interestedProducts ?? [],
      });
      logger.info('sale_interest_registered', { routeId, unitId, salesRepId, correlationId });
    }

    await checkAndPublishRouteCompleted(routeId, correlationId, eventBus);

    res.status(201).json(visit);
  });

  router.patch('/:id', async (req: Request, res: Response) => {
    const correlationId = (req.headers['x-correlation-id'] as string) ?? uuidv4();
    const visit = visitStore.getById(req.params.id);
    if (!visit) {
      res.status(404).json({ error: 'Besøk ikke funnet' });
      return;
    }

    const { status, notes, interestedProducts } = req.body as Partial<Pick<Visit, 'status' | 'notes' | 'interestedProducts'>>;
    const updated: Visit = {
      ...visit,
      status: status ?? visit.status,
      notes: notes ?? visit.notes,
      interestedProducts: interestedProducts ?? visit.interestedProducts,
    };

    visitStore.save(updated);
    logger.info('visit_updated', { visitId: updated.id, status: updated.status, correlationId });

    if (status === 'interested') {
      await eventBus.publish('sale_interest_registered', {
        routeId: updated.routeId,
        unitId: updated.unitId,
        salesRepId: updated.salesRepId,
        interestedProducts: updated.interestedProducts ?? [],
      });
    }

    res.json(updated);
  });

  router.get('/', (req: Request, res: Response) => {
    const correlationId = (req.headers['x-correlation-id'] as string) ?? uuidv4();
    const { routeId, unitId } = req.query as Record<string, string | undefined>;

    if (routeId) {
      logger.info('list_visits_by_route', { routeId, correlationId });
      res.json(visitStore.getByRouteId(routeId));
      return;
    }
    if (unitId) {
      logger.info('list_visits_by_unit', { unitId, correlationId });
      res.json(visitStore.getByUnitId(unitId));
      return;
    }

    res.status(400).json({ error: 'routeId eller unitId er påkrevd' });
  });

  return router;
}

async function checkAndPublishRouteCompleted(
  routeId: string,
  correlationId: string,
  eventBus: EventBus
): Promise<void> {
  const route = routeStore.getById(routeId);
  if (!route || route.status !== 'in_progress') return;

  const buildings = buildingStore.getAll().filter((b) => route.buildingIds.includes(b.id));
  const units = buildings.flatMap((b) => buildingStore.getUnitsForBuilding(b.id));
  const visits = visitStore.getByRouteId(routeId);
  const progress = calculateRouteProgress(route, buildings, units, visits);

  const allCompleted = progress.buildingProgress.every((bp) => bp.status === 'completed');
  if (allCompleted && progress.totalUnits > 0) {
    logger.info('all_buildings_completed', { routeId, correlationId });
    await eventBus.publish('route_completed', {
      routeId,
      salesRepId: route.salesRepId,
      date: route.date,
    });
  }
}
