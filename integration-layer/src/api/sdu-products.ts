// ── SDU Products router — produktkatalog og insentivstyring ──
// Bakoverkompatibel med KAS Core mock /products/sdu-endepunkter.

import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { sduCatalogStore } from '../catalog/SduCatalogStore.js';
import { Incentive } from '../types/sdu-catalog.js';
import { IEventBus } from '../events/IEventBus.js';
import { Topics } from '../events/EventTopics.js';
import { logger } from '../logger.js';

export function createSduProductsRouter(eventBus?: IEventBus): Router {
  const router = Router();

  // GET /products/sdu
  router.get('/sdu', (req: Request, res: Response) => {
    const { category, hasIncentive, activeOnly } = req.query;
    const products = sduCatalogStore.list({
      category: category?.toString(),
      hasIncentive: hasIncentive === 'true',
      activeOnly: activeOnly !== 'false',
    });
    res.json(products);
  });

  // GET /products/sdu/:productId
  router.get('/sdu/:productId', (req: Request, res: Response) => {
    const product = sduCatalogStore.getById(req.params.productId);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(product);
  });

  // POST /products/sdu/:productId/incentives
  router.post('/sdu/:productId/incentives', async (req: Request, res: Response) => {
    const body = req.body as Partial<Omit<Incentive, 'id'>>;
    if (!body.name || !body.type || !body.validFrom || !body.validUntil) {
      res.status(400).json({ error: 'name, type, validFrom og validUntil er påkrevd' });
      return;
    }

    try {
      const product = sduCatalogStore.addIncentive(req.params.productId, {
        name: body.name,
        description: body.description ?? '',
        type: body.type,
        value: Number(body.value),
        currency: body.currency,
        validFrom: body.validFrom,
        validUntil: body.validUntil,
        visibleToSeller: Boolean(body.visibleToSeller),
      });

      if (eventBus) {
        await eventBus.publish({
          eventId: randomUUID(),
          eventType: Topics.INCENTIVE_TRIGGERED,
          source: 'pricing-system',
          occurredAt: new Date().toISOString(),
          payload: { productId: product.productId, action: 'incentive_added' },
        }).catch(err => logger.error('Failed to publish incentive.triggered', { error: err }));
      }

      res.status(201).json(product);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message === 'Product not found') {
        res.status(404).json({ error: message });
        return;
      }
      res.status(500).json({ error: message });
    }
  });

  // DELETE /products/sdu/:productId/incentives/:incentiveId
  router.delete('/sdu/:productId/incentives/:incentiveId', (req: Request, res: Response) => {
    try {
      const product = sduCatalogStore.removeIncentive(
        req.params.productId,
        req.params.incentiveId,
      );
      res.json(product);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message === 'Product not found' || message === 'Incentive not found') {
        res.status(404).json({ error: message });
        return;
      }
      res.status(500).json({ error: message });
    }
  });

  return router;
}
