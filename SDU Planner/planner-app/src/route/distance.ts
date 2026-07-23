// ── Geodesisk distanse (km) — bytt ut ved OSRM/Mapbox uten å røre optimize.ts ──

export interface Coord {
  lat: number;
  lon: number;
}

const EARTH_RADIUS_KM = 6371;

/** Haversine-avstand mellom to WGS84-punkter, i kilometer. */
export function haversineKm(a: Coord, b: Coord): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}
