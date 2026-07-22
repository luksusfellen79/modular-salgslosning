// ── Locations router — oppslag på boenhet via opaque farid ──

import { Router, Request, Response } from 'express';
import { InMemoryCache } from '../cache/InMemoryCache.js';
import { LocationAdapter } from '../adapters/locationAdapter.js';
import { Coord, Location } from '../domain/location.js';
import { DataSource, SourceMeta } from '../types/domain.js';

const SOURCE: DataSource = 'mock';
const MAX_BATCH_FARIDS = 1000;

function meta(cached = false): SourceMeta {
  return { source: SOURCE, fetchedAt: new Date().toISOString(), cached };
}

export interface LocationResponse extends Location {
  meta: SourceMeta;
}

export interface BatchBuildingGroup {
  buildingId: string;
  coord: Coord;
  locations: Location[];
}

export interface BatchLocationsResponse {
  requested: number;
  resolved: number;
  unknownFarids: string[];
  buildings: BatchBuildingGroup[];
  meta: SourceMeta;
}

function toLocation(entry: Location | LocationResponse): Location {
  return {
    farid: entry.farid,
    buildingId: entry.buildingId,
    coord: entry.coord,
    adresse: entry.adresse,
    beboere: entry.beboere,
    tidligereProdukter: entry.tidligereProdukter,
  };
}

function groupByBuilding(locations: Location[]): BatchBuildingGroup[] {
  const groups = new Map<string, BatchBuildingGroup>();
  for (const location of locations) {
    const existing = groups.get(location.buildingId);
    if (existing) {
      existing.locations.push(location);
    } else {
      groups.set(location.buildingId, {
        buildingId: location.buildingId,
        coord: location.coord,
        locations: [location],
      });
    }
  }
  return Array.from(groups.values());
}

function dedupeFarids(farids: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const farid of farids) {
    if (!seen.has(farid)) {
      seen.add(farid);
      unique.push(farid);
    }
  }
  return unique;
}

export function createLocationsRouter(
  adapter: LocationAdapter,
  cache: InMemoryCache,
): Router {
  const router = Router();

  // POST /locations/batch — må registreres før /:farid
  router.post('/batch', async (req: Request, res: Response) => {
    const { farids } = req.body ?? {};

    if (!Array.isArray(farids) || farids.length === 0) {
      res.status(400).json({ error: 'farids must be a non-empty array of strings' });
      return;
    }

    if (!farids.every((f: unknown): f is string => typeof f === 'string')) {
      res.status(400).json({ error: 'farids must be a non-empty array of strings' });
      return;
    }

    if (farids.length > MAX_BATCH_FARIDS) {
      res.status(400).json({ error: `farids must contain at most ${MAX_BATCH_FARIDS} items` });
      return;
    }

    const uniqueFarids = dedupeFarids(farids);
    const resolved: Location[] = [];
    const misses: string[] = [];
    let allFromCache = true;

    for (const farid of uniqueFarids) {
      const cached = cache.get<LocationResponse>(farid);
      if (cached) {
        resolved.push(toLocation(cached));
      } else {
        allFromCache = false;
        misses.push(farid);
      }
    }

    if (misses.length > 0) {
      const fetched = await adapter.resolveMany(misses);
      for (const location of fetched) {
        const entry: LocationResponse = { ...location, meta: meta(false) };
        cache.set(location.farid, entry);
        resolved.push(location);
      }
    }

    const resolvedFarids = new Set(resolved.map((l) => l.farid));
    const unknownFarids = uniqueFarids.filter((f) => !resolvedFarids.has(f));

    const response: BatchLocationsResponse = {
      requested: uniqueFarids.length,
      resolved: resolved.length,
      unknownFarids,
      buildings: groupByBuilding(resolved),
      meta: meta(allFromCache && uniqueFarids.length > 0),
    };

    res.json(response);
  });

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
