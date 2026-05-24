// ── CustomerRouter — HTTP-grensesnitt for kundeintelligens ──
// Brukes av SDU CRM (beboersøk, besøkskontekst) og
// MDU CRM (MDU-kunder per bygg, churn-analyse).

import { Router, Request, Response } from 'express';
import { CustomerAdapter } from './CustomerAdapter.js';

const adapter = new CustomerAdapter();

export function createCustomerAdapterRouter(): Router {
  const router = Router();

  // ── Helse ───────────────────────────────────────────────────────────────
  router.get('/health', async (_req: Request, res: Response) => {
    res.json({ adapter: adapter.name, healthy: await adapter.isHealthy() });
  });

  // ── Beboere i bygg (SDU) ────────────────────────────────────────────────

  // GET /adapters/customer/buildings/:buildingId/residents
  router.get('/buildings/:buildingId/residents', async (req: Request, res: Response) => {
    const residents = await adapter.getResidents(req.params.buildingId);
    res.json({ buildingId: req.params.buildingId, count: residents.length, residents });
  });

  // GET /adapters/customer/buildings/:buildingId/residents/summary
  router.get('/buildings/:buildingId/residents/summary', async (req: Request, res: Response) => {
    const summaries = await adapter.getResidentSummaries(req.params.buildingId);
    res.json({ buildingId: req.params.buildingId, count: summaries.length, summaries });
  });

  // GET /adapters/customer/units/:unitId/resident
  router.get('/units/:unitId/resident', async (req: Request, res: Response) => {
    const resident = await adapter.getResidentByUnit(req.params.unitId);
    if (!resident) return res.status(404).json({ error: { code: 'IKKE_FUNNET', message: 'Ingen beboer på denne enheten' } });
    res.json(resident);
  });

  // GET /adapters/customer/residents/search?q=
  router.get('/residents/search', async (req: Request, res: Response) => {
    const q = String(req.query.q ?? '');
    if (!q || q.length < 2) return res.status(400).json({ error: { code: 'FOR_KORT_SØKETEKST', message: 'Søketekst må være minst 2 tegn' } });
    const results = await adapter.searchResidents(q);
    res.json({ query: q, count: results.length, results });
  });

  // ── Kunder (MDU) ────────────────────────────────────────────────────────

  // GET /adapters/customer/customers/:customerId
  router.get('/customers/:customerId', async (req: Request, res: Response) => {
    const customer = await adapter.getCustomer(req.params.customerId);
    if (!customer) return res.status(404).json({ error: { code: 'IKKE_FUNNET', message: 'Kunde ikke funnet' } });
    res.json(customer);
  });

  // GET /adapters/customer/buildings/:buildingId/customers
  router.get('/buildings/:buildingId/customers', async (req: Request, res: Response) => {
    const customers = await adapter.getCustomersByBuilding(req.params.buildingId);
    res.json({ buildingId: req.params.buildingId, count: customers.length, customers });
  });

  // ── Salgskontekst: churn, win-back, oppgradering ────────────────────────

  // GET /adapters/customer/persons/:personId/sales-context
  router.get('/persons/:personId/sales-context', async (req: Request, res: Response) => {
    const ctx = await adapter.getSalesContext(req.params.personId);
    if (!ctx) return res.status(404).json({ error: { code: 'IKKE_FUNNET', message: 'Ingen salgskontekst for denne personen' } });
    res.json(ctx);
  });

  // GET /adapters/customer/win-back
  router.get('/win-back', async (_req: Request, res: Response) => {
    const candidates = await adapter.getWinBackCandidates();
    res.json({ count: candidates.length, candidates });
  });

  return router;
}
