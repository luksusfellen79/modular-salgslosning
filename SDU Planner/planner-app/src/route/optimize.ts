// ── Rute-optimalisering — ren, framework-fri (nearest-neighbor + 2-opt) ──

import { Coord, haversineKm } from './distance';

export type { Coord } from './distance';

export interface Stop {
  buildingId: string;
  coord: Coord;
}

export interface RouteInput {
  start: Coord;
  stops: Stop[];
}

export interface OptimizedRoute {
  order: Stop[];
  totalDistanceKm: number;
  legs: number[];
}

type DistanceFn = (a: Coord, b: Coord) => number;

const MAX_TWO_OPT_ITERATIONS = 1000;

/** Dedupliser på buildingId — behold første forekomst. */
function dedupeStops(stops: Stop[]): Stop[] {
  const seen = new Set<string>();
  const unique: Stop[] = [];
  for (const stop of stops) {
    if (!seen.has(stop.buildingId)) {
      seen.add(stop.buildingId);
      unique.push(stop);
    }
  }
  return unique;
}

function computeLegs(
  start: Coord,
  order: Stop[],
  distanceFn: DistanceFn,
): number[] {
  if (order.length === 0) return [];

  const legs: number[] = [];
  legs.push(distanceFn(start, order[0].coord));
  for (let i = 0; i < order.length - 1; i++) {
    legs.push(distanceFn(order[i].coord, order[i + 1].coord));
  }
  legs.push(distanceFn(order[order.length - 1].coord, start));
  return legs;
}

function totalFromLegs(legs: number[]): number {
  return legs.reduce((sum, d) => sum + d, 0);
}

/**
 * Nearest-neighbor fra start.
 * Ved lik avstand: stabil tie-break på buildingId (alfabetisk).
 */
function nearestNeighbor(
  start: Coord,
  stops: Stop[],
  distanceFn: DistanceFn,
): Stop[] {
  const remaining = [...stops];
  const order: Stop[] = [];
  let current = start;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = distanceFn(current, remaining[0].coord);

    for (let i = 1; i < remaining.length; i++) {
      const d = distanceFn(current, remaining[i].coord);
      if (
        d < bestDist
        || (d === bestDist && remaining[i].buildingId < remaining[bestIdx].buildingId)
      ) {
        bestDist = d;
        bestIdx = i;
      }
    }

    const [chosen] = remaining.splice(bestIdx, 1);
    order.push(chosen);
    current = chosen.coord;
  }

  return order;
}

/**
 * 2-opt på lukket tur [start, s1..sn, start].
 * Index 0 i den logiske turen er start og flyttes aldri — vi reverserer kun
 * delsekvenser i `order` (stopp mellom start og retur).
 */
function twoOpt(
  start: Coord,
  order: Stop[],
  distanceFn: DistanceFn,
): Stop[] {
  if (order.length < 2) return order;

  let best = [...order];
  let bestTotal = totalFromLegs(computeLegs(start, best, distanceFn));
  let improved = true;
  let iterations = 0;

  while (improved && iterations < MAX_TWO_OPT_ITERATIONS) {
    improved = false;
    iterations += 1;

    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ];
        const candidateTotal = totalFromLegs(computeLegs(start, candidate, distanceFn));
        if (candidateTotal < bestTotal) {
          best = candidate;
          bestTotal = candidateTotal;
          improved = true;
        }
      }
    }
  }

  return best;
}

/**
 * Optimaliser rundtur: start → stopp → start.
 * Konstruksjon: nearest-neighbor. Forbedring: 2-opt.
 */
export function optimizeRoute(
  input: RouteInput,
  distanceFn: DistanceFn = haversineKm,
): OptimizedRoute {
  const stops = dedupeStops(input.stops);

  if (stops.length === 0) {
    return { order: [], totalDistanceKm: 0, legs: [] };
  }

  const nnOrder = nearestNeighbor(input.start, stops, distanceFn);
  const order = twoOpt(input.start, nnOrder, distanceFn);
  const legs = computeLegs(input.start, order, distanceFn);

  return {
    order,
    totalDistanceKm: totalFromLegs(legs),
    legs,
  };
}

/** Kun for tester — nearest-neighbor uten 2-opt. */
export function nearestNeighborOnly(
  input: RouteInput,
  distanceFn: DistanceFn = haversineKm,
): OptimizedRoute {
  const stops = dedupeStops(input.stops);
  if (stops.length === 0) {
    return { order: [], totalDistanceKm: 0, legs: [] };
  }
  const order = nearestNeighbor(input.start, stops, distanceFn);
  const legs = computeLegs(input.start, order, distanceFn);
  return {
    order,
    totalDistanceKm: totalFromLegs(legs),
    legs,
  };
}
