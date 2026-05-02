// ── BuildingsRouter — planlegger-endepunkter for bygg og enheter ──
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { buildingStore } from '../storage/building-store';
import { KasCoreClient } from '../kas-core/kas-core-client';
import { visitStore } from '../storage/visit-store';
import { Building } from '../types';
import logger from '../logger';

const router = Router();
const kasCore = new KasCoreClient();

router.get('/', (req: Request, res: Response) => {
  const correlationId = (req.headers['x-correlation-id'] as string) ?? uuidv4();
  logger.info('list_buildings', { correlationId });
  res.json(buildingStore.getAll());
});

router.get('/:id', async (req: Request, res: Response) => {
  const correlationId = (req.headers['x-correlation-id'] as string) ?? uuidv4();
  const building = buildingStore.getById(req.params.id);
  if (!building) {
    res.status(404).json({ error: 'Bygg ikke funnet' });
    return;
  }
  const units = buildingStore.getUnitsForBuilding(building.id);
  let enrichedUnits = units;

  try {
    const residents = await kasCore.getResidentsForBuilding(building.id, correlationId);
    enrichedUnits = units.map((u) => {
      const resident = residents.find((r) => r.unitId === u.id);
      if (!resident) return u;
      return {
        ...u,
        residentName: resident.name,
        isExistingCustomer: resident.isExistingCustomer,
        existingProducts: resident.existingProducts,
      };
    });
  } catch (err) {
    logger.warn('kas_core_enrichment_failed', {
      buildingId: building.id,
      error: err instanceof Error ? err.message : String(err),
      correlationId,
    });
  }

  res.json({ ...building, units: enrichedUnits });
});

router.post('/', (req: Request, res: Response) => {
  const correlationId = (req.headers['x-correlation-id'] as string) ?? uuidv4();
  const { address, city, postalCode, totalUnits, buildingType, coordinates, notes } = req.body as Partial<Building>;

  if (!address || !city || !postalCode || !totalUnits || !buildingType) {
    res.status(400).json({ error: 'Mangler påkrevde felt: address, city, postalCode, totalUnits, buildingType' });
    return;
  }

  const building: Building = {
    id: uuidv4(),
    address,
    city,
    postalCode,
    totalUnits,
    buildingType,
    coordinates,
    notes,
    createdAt: new Date().toISOString(),
  };

  buildingStore.save(building);
  logger.info('building_created', { buildingId: building.id, correlationId });
  res.status(201).json(building);
});

router.get('/:id/units', async (req: Request, res: Response) => {
  const correlationId = (req.headers['x-correlation-id'] as string) ?? uuidv4();
  const building = buildingStore.getById(req.params.id);
  if (!building) {
    res.status(404).json({ error: 'Bygg ikke funnet' });
    return;
  }

  const units = buildingStore.getUnitsForBuilding(building.id);
  const routeId = req.query.routeId as string | undefined;

  if (routeId) {
    const visits = visitStore.getByRouteId(routeId);
    const visitMap = new Map(visits.map((v) => [v.unitId, v]));
    const withStatus = units.map((u) => ({
      ...u,
      visitStatus: visitMap.get(u.id)?.status ?? 'not_visited',
    }));
    res.json(withStatus);
    return;
  }

  res.json(units);
});

export default router;
