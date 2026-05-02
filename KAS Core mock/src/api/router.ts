// ── Express API router ──
import { Router, Request, Response } from 'express';
import { logger } from '../logger';
import {
  customers,
  findCustomerById,
  findCustomersByBuildingId,
  findResidentByUnitId,
  residents,
  searchResidents,
} from '../seed';

export const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', residents: residents.length, customers: customers.length });
});

router.get('/buildings/:buildingId/residents', (req: Request, res: Response) => {
  const buildingId = req.params.buildingId;
  const buildingResidents = residents.filter((resident) => resident.buildingId === buildingId);

  if (buildingResidents.length === 0) {
    return res.status(404).json({ error: 'Building not found' });
  }

  const summary = buildingResidents.map((resident) => ({
    unitId: resident.unitId,
    name: resident.name,
    isExistingCustomer: resident.isExistingCustomer,
    existingProducts: resident.existingProducts,
  }));

  res.json(summary);
});

router.get('/buildings/:buildingId/residents/full', (req: Request, res: Response) => {
  const buildingId = req.params.buildingId;
  const buildingResidents = residents.filter((resident) => resident.buildingId === buildingId);

  if (buildingResidents.length === 0) {
    return res.status(404).json({ error: 'Building not found' });
  }

  res.json(buildingResidents);
});

router.get('/residents/:unitId', (req: Request, res: Response) => {
  const resident = findResidentByUnitId(req.params.unitId);

  if (!resident) {
    return res.status(404).json({ error: 'Resident not found' });
  }

  res.json(resident);
});

router.get('/customers/:customerId', (req: Request, res: Response) => {
  const customer = findCustomerById(req.params.customerId);

  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  res.json(customer);
});

router.get('/customers', (req: Request, res: Response) => {
  const buildingId = req.query.buildingId?.toString();

  if (buildingId) {
    return res.json(findCustomersByBuildingId(buildingId));
  }

  res.json(customers);
});

router.get('/search', (req: Request, res: Response) => {
  const query = req.query.q?.toString();

  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }

  res.json(searchResidents(query));
});

router.use((req: Request, res: Response) => {
  logger.warn('Route not found', { path: req.path, method: req.method });
  res.status(404).json({ error: 'Not found' });
});
