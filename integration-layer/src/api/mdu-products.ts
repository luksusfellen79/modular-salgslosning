// ── MDU Products router — borettslag-pakker og komponenter ──
// Bakoverkompatibel med KAS Core mock /products/mdu-endepunkter.

import { Router, Request, Response } from 'express';
import { mduCatalogStore } from '../catalog/MduCatalogStore.js';

export function createMduProductsRouter(): Router {
  const router = Router();

  // GET /products/mdu
  router.get('/mdu', (req: Request, res: Response) => {
    const { tier, hasIncentive, activeOnly } = req.query;
    const packages = mduCatalogStore.listPackages({
      tier: tier?.toString(),
      hasIncentive: hasIncentive === 'true',
      activeOnly: activeOnly !== 'false',
    });
    res.json(packages);
  });

  // GET /products/mdu/components — må registreres før /mdu/:packageId
  router.get('/mdu/components', (req: Request, res: Response) => {
    const { category } = req.query;
    const components = mduCatalogStore.listComponents(category?.toString());
    res.json(components);
  });

  // GET /products/mdu/:packageId
  router.get('/mdu/:packageId', (req: Request, res: Response) => {
    const pkg = mduCatalogStore.getPackageById(req.params.packageId);
    if (!pkg) {
      res.status(404).json({ error: 'Package not found' });
      return;
    }
    res.json(pkg);
  });

  return router;
}
