// ── Buildings router — alle boenheter i ett bygg (via LocationAdapter) ──

import { Router, Request, Response } from 'express';
import { InMemoryCache } from '../cache/InMemoryCache.js';
import { LocationAdapter } from '../adapters/locationAdapter.js';
import { Coord, Location } from '../domain/location.js';
import { DataSource, SourceMeta } from '../types/domain.js';

const SOURCE: DataSource = 'mock';

function meta(cached = false): SourceMeta {
  return { source: SOURCE, fetchedAt: new Date().toISOString(), cached };
}

export interface BuildingLocationsResponse {
  buildingId: string;
  coord: Coord | null;
  count: number;
  locations: Location[];
  meta: SourceMeta;
}

export function createBuildingsLocationsRouter(
  adapter: LocationAdapter,
  cache: InMemoryCache,
): Router {
  const router = Router();

  // GET /buildings/:buildingId/locations
  router.get('/:buildingId/locations', async (req: Request, res: Response) => {
    const { buildingId } = req.params;
    const cacheKey = `building:${buildingId}`;

    const cached = cache.get<BuildingLocationsResponse>(cacheKey);
    if (cached) {
      res.json({ ...cached, meta: { ...cached.meta, cached: true } });
      return;
    }

    const locations = await adapter.listByBuilding(buildingId);
    const response: BuildingLocationsResponse = {
      buildingId,
      coord: locations[0]?.coord ?? null,
      count: locations.length,
      locations,
      meta: meta(false),
    };

    cache.set(cacheKey, response);
    res.json(response);
  });

  return router;
}
