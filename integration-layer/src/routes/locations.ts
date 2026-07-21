// ── Locations router — oppslag på boenhet via opaque farid ──

import { Router, Request, Response } from 'express';
import { InMemoryCache } from '../cache/InMemoryCache.js';
import { LocationAdapter } from '../adapters/locationAdapter.js';
import { Location } from '../domain/location.js';
import { DataSource, SourceMeta } from '../types/domain.js';

const SOURCE: DataSource = 'mock';

function meta(cached = false): SourceMeta {
  return { source: SOURCE, fetchedAt: new Date().toISOString(), cached };
}

export interface LocationResponse extends Location {
  meta: SourceMeta;
}

export function createLocationsRouter(
  adapter: LocationAdapter,
  cache: InMemoryCache,
): Router {
  const router = Router();

  router.get('/:farid', async (req: Request, res: Response) => {
    const { farid } = req.params;

    const cacheKey = farid;
    const cached = cache.get<LocationResponse>(cacheKey);
    if (cached) {
      res.json({ ...cached, meta: { ...cached.meta, cached: true } });
      return;
    }

    const location = await adapter.getByFarid(farid);
    if (!location) {
      res.status(404).json({ error: 'unknown farid' });
      return;
    }

    const response: LocationResponse = { ...location, meta: meta(false) };
    cache.set(cacheKey, response);
    res.json(response);
  });

  return router;
}
