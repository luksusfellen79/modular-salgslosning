// ── Customers router — beboere og kundeprofiler ──
// Bakoverkompatibel med KAS Core mock sitt API-design.

import { Router, Request, Response } from 'express';
import { AdapterRegistry } from '../registry/AdapterRegistry.js';

export function createCustomersRouter(registry: AdapterRegistry): Router {
  const router = Router();

  // GET /buildings/:buildingId/residents — ResidentSummary[] (brukes av route-planning)
  router.get('/buildings/:buildingId/residents', async (req: Request, res: Response) => {
    const summaries = await registry.getResidentSummaries(req.params.buildingId);
    res.json(summaries);
  });

  // GET /buildings/:buildingId/residents/full — Resident[] komplett
  router.get('/buildings/:buildingId/residents/full', async (req: Request, res: Response) => {
    const residents = await registry.getResidents(req.params.buildingId);
    res.json(residents);
  });

  // GET /residents/:unitId — enkelt beboer med full profil
  router.get('/residents/:unitId', async (req: Request, res: Response) => {
    const resident = await registry.getResidentByUnit(req.params.unitId);
    if (!resident) {
      res.status(404).json({ error: 'Resident not found', unitId: req.params.unitId });
      return;
    }
    res.json(resident);
  });

  // GET /customers/:customerId — detaljert kundeprofil
  router.get('/customers/:customerId', async (req: Request, res: Response) => {
    const customer = await registry.getCustomer(req.params.customerId);
    if (!customer) {
      res.status(404).json({ error: 'Customer not found', customerId: req.params.customerId });
      return;
    }
    res.json(customer);
  });

  // GET /customers?buildingId=xxx — alle kunder i et bygg
  router.get('/customers', async (req: Request, res: Response) => {
    const buildingId = req.query.buildingId as string | undefined;
    if (!buildingId) {
      res.status(400).json({ error: 'buildingId query parameter required' });
      return;
    }
    const customers = await registry.getCustomersByBuilding(buildingId);
    res.json(customers);
  });

  // GET /search?q=xxx — søk på navn eller adresse
  router.get('/search', async (req: Request, res: Response) => {
    const q = req.query.q as string | undefined;
    if (!q || q.trim().length < 2) {
      res.status(400).json({ error: 'Query parameter q must be at least 2 characters' });
      return;
    }
    const results = await registry.searchResidents(q.trim());
    res.json(results);
  });

  return router;
}
