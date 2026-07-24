import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { fetchBuildingCoord } from '../lib/integrationLayer';
import type { UnitVisitStatus } from '../lib/salesCore';

export interface RoundMapUnit {
  unitId: string;
  buildingId: string;
  address?: string;
  visitStatus: UnitVisitStatus;
}

export interface RoundMapProps {
  units: RoundMapUnit[];
  onSelectBuilding?: (buildingId: string) => void;
  className?: string;
}

type BuildingAggStatus = 'pending' | 'progress' | 'done' | 'sold';

const STATUS_COLOR: Record<BuildingAggStatus, string> = {
  pending: '#94A3B8',
  progress: '#EAB308',
  done: '#3B82F6',
  sold: '#16A34A',
};

const KV =
  'https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png';

const DONE_STATUSES: UnitVisitStatus[] = ['visited', 'not_home', 'sold', 'no_interest'];

function aggregateBuildingStatus(statuses: UnitVisitStatus[]): BuildingAggStatus {
  if (statuses.length === 0 || statuses.every((s) => s === 'pending')) return 'pending';
  if (statuses.some((s) => s === 'sold')) return 'sold';
  if (statuses.every((s) => DONE_STATUSES.includes(s))) return 'done';
  return 'progress';
}

function buildingIcon(color: string, count: number): L.DivIcon {
  return L.divIcon({
    className: 'round-map-marker',
    html: `<div style="
      width:30px;height:30px;border-radius:50%;
      background:${color};color:#fff;font:700 12px/30px system-ui,sans-serif;
      text-align:center;border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.35);
    ">${count}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function gpsIcon(): L.DivIcon {
  return L.divIcon({
    className: 'round-map-gps',
    html: `<div style="
      width:16px;height:16px;border-radius:50%;
      background:#2563EB;border:3px solid #fff;
      box-shadow:0 0 0 2px rgba(37,99,235,.35),0 1px 4px rgba(0,0,0,.35);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

/**
 * Status-kart for dagens runde — bygg farget etter besøksfremdrift.
 * Ingen ruteoptimalisering; fliser med Kartverket + OSM-fallback.
 */
export function RoundMap({ units, onSelectBuilding, className }: RoundMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onSelectRef = useRef(onSelectBuilding);
  onSelectRef.current = onSelectBuilding;
  const unitsRef = useRef(units);
  unitsRef.current = units;

  const unitsKey = units
    .map((u) => `${u.buildingId}:${u.unitId}:${u.visitStatus}`)
    .sort()
    .join('|');

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const unitsSnapshot = unitsRef.current;
    let cancelled = false;
    let osmAdded = false;
    let watchId: number | null = null;
    let gpsMarker: L.Marker | null = null;
    let resizeTimer = 0;

    const map = L.map(el, {
      zoomControl: true,
      attributionControl: true,
    });
    mapRef.current = map;

    const kvLayer = L.tileLayer(KV, { maxZoom: 19, attribution: '© Kartverket' });
    kvLayer.addTo(map);
    kvLayer.on('tileerror', () => {
      if (osmAdded || cancelled) return;
      osmAdded = true;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map);
    });

    const byBuilding = new Map<string, RoundMapUnit[]>();
    for (const unit of unitsSnapshot) {
      const list = byBuilding.get(unit.buildingId) ?? [];
      list.push(unit);
      byBuilding.set(unit.buildingId, list);
    }

    const buildingIds = [...byBuilding.keys()];

    void (async () => {
      const coords = await Promise.all(
        buildingIds.map((id) => fetchBuildingCoord(id)),
      );
      if (cancelled || mapRef.current !== map) return;

      const latLngs: L.LatLngExpression[] = [];

      for (let i = 0; i < buildingIds.length; i++) {
        const buildingId = buildingIds[i];
        const coord = coords[i];
        if (!coord) continue;

        const buildingUnits = byBuilding.get(buildingId) ?? [];
        const statuses = buildingUnits.map((u) => u.visitStatus);
        const agg = aggregateBuildingStatus(statuses);
        const visitedCount = statuses.filter((s) => s !== 'pending').length;
        const address =
          buildingUnits.find((u) => u.address)?.address?.split(',')[0]?.trim()
          ?? buildingId;

        const latLng: L.LatLngExpression = [coord.lat, coord.lon];
        latLngs.push(latLng);

        const marker = L.marker(latLng, {
          icon: buildingIcon(STATUS_COLOR[agg], buildingUnits.length),
          title: address,
        }).addTo(map);

        marker.bindPopup(
          `<strong>${address}</strong><br/>${visitedCount}/${buildingUnits.length} besøkt`,
        );
        marker.on('click', () => {
          onSelectRef.current?.(buildingId);
        });
      }

      if (latLngs.length === 1) {
        map.setView(latLngs[0], 16);
      } else if (latLngs.length > 1) {
        map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
      } else {
        map.setView([59.9139, 10.7522], 11);
      }

      resizeTimer = window.setTimeout(() => {
        map.invalidateSize();
      }, 0);
    })();

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (cancelled || mapRef.current !== map) return;
          const latLng: L.LatLngExpression = [pos.coords.latitude, pos.coords.longitude];
          if (gpsMarker) {
            gpsMarker.setLatLng(latLng);
          } else {
            gpsMarker = L.marker(latLng, {
              icon: gpsIcon(),
              title: 'Din posisjon',
              zIndexOffset: 1000,
            }).addTo(map);
          }
        },
        () => { /* stille avslag/feil */ },
        { enableHighAccuracy: true, maximumAge: 10_000 },
      );
    }

    return () => {
      cancelled = true;
      window.clearTimeout(resizeTimer);
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      map.remove();
      mapRef.current = null;
    };
  }, [unitsKey]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height: 320, width: '100%' }}
      role="img"
      aria-label="Kart over bygg i dagens runde"
    />
  );
}
