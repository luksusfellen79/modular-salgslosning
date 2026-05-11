// ── Pricing router — kampanjer og prisberegning ──

import { Router, Request, Response } from 'express';
import { AdapterRegistry } from '../registry/AdapterRegistry.js';
import { CustomerSegment } from '../types/domain.js';

const VALID_SEGMENTS: CustomerSegment[] = ['new-customer', 'win-back', 'existing-customer', 'all'];

export function createPricingRouter(registry: AdapterRegistry): Router {
  const router = Router();

  // GET /pricing/campaigns — alle aktive kampanjer
  router.get('/campaigns', async (_req: Request, res: Response) => {
    const campaigns = await registry.getCampaigns();
    res.json(campaigns);
  });

  // GET /pricing/campaigns?segment=new-customer — kampanjer for et kundesegment
  router.get('/campaigns/segment', async (req: Request, res: Response) => {
    const segment = req.query.segment as string | undefined;
    if (!segment || !VALID_SEGMENTS.includes(segment as CustomerSegment)) {
      res.status(400).json({
        error: 'Invalid segment',
        validSegments: VALID_SEGMENTS,
      });
      return;
    }
    const campaigns = await registry.getCampaignsForSegment(segment as CustomerSegment);
    res.json(campaigns);
  });

  // GET /pricing/calculate/:productId — beregn pris for et produkt
  // Optional: ?customerId=xxx for kundetilpasset pris
  router.get('/calculate/:productId', async (req: Request, res: Response) => {
    const { productId } = req.params;
    const customerId = req.query.customerId as string | undefined;

    const result = await registry.calculatePrice(productId, customerId);
    if (!result) {
      res.status(404).json({ error: 'Product not found or no pricing available', productId });
      return;
    }
    res.json(result);
  });

  return router;
}
