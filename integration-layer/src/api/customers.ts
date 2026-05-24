// ── Customers router — beboere og kundeprofiler ──
// Bakoverkompatibel med KAS Core mock sitt API-design.

import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { AdapterRegistry } from '../registry/AdapterRegistry.js';
import { FiberAdapter } from '../adapters/fiber/FiberAdapter.js';
import { IEventBus } from '../events/IEventBus.js';
import { Topics } from '../events/EventTopics.js';
import { InMemoryCache } from '../cache/InMemoryCache.js';
import { logger } from '../logger.js';

export function createCustomersRouter(
  registry: AdapterRegistry,
  deps?: { fiberAdapter?: FiberAdapter; eventBus?: IEventBus; cache?: InMemoryCache },
): Router {
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

  // POST /customers — SDU CRM: opprett kunde ved salg (bakoverkompatibel med KAS Core mock)
  router.post('/customers', async (req: Request, res: Response) => {
    const fiberAdapter = deps?.fiberAdapter;
    if (!fiberAdapter) {
      res.status(503).json({ error: 'SDU customer registration not available' });
      return;
    }

    const {
      unitId,
      soldProducts = [],
      campaignId,
      campaignName,
      salesRepName,
      notes,
    } = req.body as {
      unitId?: string;
      soldProducts?: string[];
      campaignId?: string;
      campaignName?: string;
      salesRepName?: string;
      notes?: string;
    };

    if (!unitId) {
      res.status(400).json({ error: 'unitId er påkrevd' });
      return;
    }

    try {
      const result = await fiberAdapter.registerSDUSale({
        unitId,
        soldProducts,
        campaignId,
        campaignName,
        salesRepName,
        notes,
      });

      deps?.cache?.delete(`residents:full:${result.customer.buildingId}`);
      deps?.cache?.delete(`resident:${unitId}`);

      if (deps?.eventBus) {
        const occurredAt = new Date().toISOString();
        const basePayload = {
          customerId: result.customer.customerId,
          unitId,
          buildingId: result.customer.buildingId,
          soldProducts,
          campaignId,
          campaignName,
          salesRepName,
          channel: 'sdu',
        };

        await deps.eventBus.publish({
          eventId: randomUUID(),
          eventType: Topics.CUSTOMER_CREATED,
          source: 'fiber-system',
          occurredAt,
          payload: { ...basePayload, created: result.created },
        }).catch(err => {
          logger.error('Failed to publish customer.created', { error: err });
        });

        if (result.created) {
          await deps.eventBus.publish({
            eventId: randomUUID(),
            eventType: Topics.SALE_CREATED,
            source: 'sdu-crm',
            occurredAt,
            payload: basePayload,
          }).catch(err => {
            logger.error('Failed to publish sale.created', { error: err });
          });
        }
      }

      res.status(result.created ? 201 : 200).json({
        customer: result.customer,
        created: result.created,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('Ingen beboer')) {
        res.status(404).json({ error: message });
        return;
      }
      logger.error('POST /customers failed', { error: err });
      res.status(500).json({ error: 'Kunne ikke registrere SDU-salg' });
    }
  });

  return router;
}
