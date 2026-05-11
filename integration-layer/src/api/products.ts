// ── Products router — produktkatalog og tilgjengelighet ──

import { Router, Request, Response } from 'express';
import { AdapterRegistry } from '../registry/AdapterRegistry.js';

export function createProductsRouter(registry: AdapterRegistry): Router {
  const router = Router();

  // GET /products — full produktkatalog aggregert fra alle adaptere
  router.get('/', async (_req: Request, res: Response) => {
    const products = await registry.getAllProducts();
    res.json(products);
  });

  // GET /products/:productId — enkelt produkt
  router.get('/:productId', async (req: Request, res: Response) => {
    const product = await registry.getProductById(req.params.productId);
    if (!product) {
      res.status(404).json({ error: 'Product not found', productId: req.params.productId });
      return;
    }
    res.json(product);
  });

  // GET /products/available?buildingId=xxx&unitId=xxx
  // Returnerer tilgjengelige produkter med kampanjepriser for en lokasjon
  router.get('/available/check', async (req: Request, res: Response) => {
    const buildingId = req.query.buildingId as string | undefined;
    const unitId = req.query.unitId as string | undefined;
    const result = await registry.getAvailableProducts(buildingId, unitId);
    res.json(result);
  });

  return router;
}
