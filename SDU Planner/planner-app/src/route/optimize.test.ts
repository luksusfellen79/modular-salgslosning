import { describe, expect, it } from 'vitest';
import { Coord } from './distance';
import { nearestNeighborOnly, optimizeRoute, RouteInput, Stop } from './optimize';

/** Euklidsk metrikk på et enhetsrutenett (lat/lon brukt som x/y). */
function euclidean(a: Coord, b: Coord): number {
  const dx = a.lat - b.lat;
  const dy = a.lon - b.lon;
  return Math.sqrt(dx * dx + dy * dy);
}

function stop(buildingId: string, x: number, y: number): Stop {
  return { buildingId, coord: { lat: x, lon: y } };
}

describe('optimizeRoute', () => {
  it('gir eksakt rekkefølge og total for håndregnet rutenett-fasit', () => {
    // Start (0,0) → a(2,0) → b(2,2) → c(0,2) → start
    // NN: a og c begge dist 2 → tie-break "a"; deretter b; deretter c.
    // Legs: 2 + 2 + 2 + 2 = 8
    const input: RouteInput = {
      start: { lat: 0, lon: 0 },
      stops: [
        stop('c', 0, 2),
        stop('b', 2, 2),
        stop('a', 2, 0),
      ],
    };

    const result = optimizeRoute(input, euclidean);

    expect(result.order.map((s) => s.buildingId)).toEqual(['a', 'b', 'c']);
    expect(result.legs).toEqual([2, 2, 2, 2]);
    expect(result.totalDistanceKm).toBe(8);
  });

  it('forbedrer med 2-opt når nearest-neighbor er suboptimal', () => {
    // NN: a(0,1) → c(1,0) → d(2,0) → b(2,2) → start  (kryssende)
    // 2-opt finner kortere tur (f.eks. a → b → d → c).
    const input: RouteInput = {
      start: { lat: 0, lon: 0 },
      stops: [
        stop('a', 0, 1),
        stop('b', 2, 2),
        stop('c', 1, 0),
        stop('d', 2, 0),
      ],
    };

    const nn = nearestNeighborOnly(input, euclidean);
    const optimized = optimizeRoute(input, euclidean);

    expect(nn.order.map((s) => s.buildingId)).toEqual(['a', 'c', 'd', 'b']);
    expect(optimized.totalDistanceKm).toBeLessThan(nn.totalDistanceKm);
  });

  it('er deterministisk — samme input gir samme output', () => {
    const input: RouteInput = {
      start: { lat: 59.91, lon: 10.75 },
      stops: [
        stop('building-c', 59.92, 10.76),
        stop('building-a', 59.915, 10.74),
        stop('building-b', 59.918, 10.755),
        stop('building-a', 59.999, 10.999), // duplikat — skal ignoreres
      ],
    };

    const first = optimizeRoute(input, euclidean);
    const second = optimizeRoute(input, euclidean);

    expect(second).toEqual(first);
    expect(first.order.map((s) => s.buildingId)).toEqual(
      [...first.order.map((s) => s.buildingId)],
    );
    // kun én forekomst av building-a
    expect(first.order.filter((s) => s.buildingId === 'building-a')).toHaveLength(1);
  });

  it('inkluderer retur til start i legs og total (rundtur)', () => {
    const input: RouteInput = {
      start: { lat: 0, lon: 0 },
      stops: [stop('a', 3, 0), stop('b', 3, 4)],
    };

    const result = optimizeRoute(input, euclidean);

    // NN: a (3), deretter b (4), retur b→start (5) → legs [3,4,5], total 12
    expect(result.order.map((s) => s.buildingId)).toEqual(['a', 'b']);
    expect(result.legs).toHaveLength(result.order.length + 1);
    expect(result.legs[result.legs.length - 1]).toBe(5);
    expect(result.totalDistanceKm).toBe(12);
    expect(result.legs.reduce((s, d) => s + d, 0)).toBe(result.totalDistanceKm);
  });

  it('håndterer 0 stopp', () => {
    const result = optimizeRoute({ start: { lat: 1, lon: 2 }, stops: [] }, euclidean);
    expect(result.order).toEqual([]);
    expect(result.totalDistanceKm).toBe(0);
    expect(result.legs).toEqual([]);
  });

  it('håndterer 1 stopp som start→stopp→start', () => {
    const input: RouteInput = {
      start: { lat: 0, lon: 0 },
      stops: [stop('only', 4, 0)],
    };

    const result = optimizeRoute(input, euclidean);

    expect(result.order.map((s) => s.buildingId)).toEqual(['only']);
    expect(result.legs).toEqual([4, 4]);
    expect(result.totalDistanceKm).toBe(8);
  });
});
