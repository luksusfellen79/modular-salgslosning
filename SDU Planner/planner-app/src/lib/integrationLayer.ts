import { Resident } from './types';

const BASE =
  (import.meta.env.VITE_INTEGRATION_LAYER_URL as string | undefined)
  ?? 'https://integration-layer-production.up.railway.app';

export async function fetchResidents(buildingId: string): Promise<Resident[]> {
  const res = await fetch(`${BASE}/buildings/${buildingId}/residents/full`);
  if (!res.ok) throw new Error(`Integration Layer: ${res.status}`);
  const data = await res.json() as Array<Resident & { meta?: unknown; campaigns?: unknown[] }>;
  return data.map(({ unitId, buildingId: bid, unitNumber, floor, name, phone, isExistingCustomer, existingProducts }) => ({
    unitId,
    buildingId: bid,
    unitNumber,
    floor,
    name,
    phone,
    isExistingCustomer,
    existingProducts,
  }));
}

export interface BuildingLocation {
  buildingId: string;
  coord: { lat: number; lon: number } | null;
  count: number;
}

/** Henter byggkoordinater via IL GET /buildings/:id/locations. */
export async function fetchBuildingCoord(buildingId: string): Promise<BuildingLocation> {
  const res = await fetch(`${BASE}/buildings/${buildingId}/locations`);
  if (!res.ok) throw new Error(`Integration Layer: ${res.status}`);
  const data = await res.json() as {
    buildingId: string;
    coord: { lat: number; lon: number } | null;
    count: number;
  };
  return {
    buildingId: data.buildingId,
    coord: data.coord,
    count: data.count,
  };
}

export interface ResolvedStops {
  stops: { buildingId: string; coord: { lat: number; lon: number } }[];
  missing: string[];
}

/**
 * Resolver koordinater for flere bygg parallelt.
 * Bygg uten coord eller med feilet kall lander i `missing`.
 */
export async function resolveStops(buildingIds: string[]): Promise<ResolvedStops> {
  const unique = [...new Set(buildingIds)];
  const results = await Promise.all(
    unique.map(async (id) => {
      try {
        const loc = await fetchBuildingCoord(id);
        return { id, loc };
      } catch {
        return { id, loc: null as BuildingLocation | null };
      }
    }),
  );

  const stops: ResolvedStops['stops'] = [];
  const missing: string[] = [];

  for (const { id, loc } of results) {
    if (loc?.coord) {
      stops.push({ buildingId: id, coord: loc.coord });
    } else {
      missing.push(id);
    }
  }

  return { stops, missing };
}
