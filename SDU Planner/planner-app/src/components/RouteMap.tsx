import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Coord, Stop } from '../route/optimize';

export interface RouteMapProps {
  start: Coord;
  order: Stop[];
  className?: string;
  /** Linjefarge for ruta — forbered for én farge per selger. */
  routeColor?: string;
}

const DEFAULT_ROUTE_COLOR = '#005A8E';

function toLatLng(coord: Coord): L.LatLngExpression {
  return [coord.lat, coord.lon];
}

function startIcon(): L.DivIcon {
  return L.divIcon({
    className: 'route-map-marker',
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:#16A34A;color:#fff;font:700 13px/28px system-ui,sans-serif;
      text-align:center;border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.35);
    ">S</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function stopIcon(n: number): L.DivIcon {
  return L.divIcon({
    className: 'route-map-marker',
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:#0F172A;color:#fff;font:700 12px/28px system-ui,sans-serif;
      text-align:center;border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.35);
    ">${n}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

/**
 * Viser en optimalisert rundtur på Kartverkets topo-fliser.
 * Ren visning — ingen IL-kall eller optimalisering.
 */
export function RouteMap({
  start,
  order,
  className,
  routeColor = DEFAULT_ROUTE_COLOR,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const map = L.map(el, {
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(
      'https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png',
      { attribution: '© Kartverket', maxZoom: 18 },
    ).addTo(map);

    const routePoints: L.LatLngExpression[] = [
      toLatLng(start),
      ...order.map((s) => toLatLng(s.coord)),
      toLatLng(start),
    ];

    L.polyline(routePoints, {
      color: routeColor,
      weight: 4,
      opacity: 0.85,
    }).addTo(map);

    L.marker(toLatLng(start), { icon: startIcon(), title: 'Start' }).addTo(map);

    order.forEach((stop, index) => {
      L.marker(toLatLng(stop.coord), {
        icon: stopIcon(index + 1),
        title: `${index + 1}. ${stop.buildingId}`,
      }).addTo(map);
    });

    const boundsPoints: L.LatLngExpression[] = [
      toLatLng(start),
      ...order.map((s) => toLatLng(s.coord)),
    ];

    if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [40, 40] });
    }

    // Leaflet trenger invalidateSize etter layout
    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 0);

    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
    };
  }, [start, order, routeColor]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: className ? undefined : 320 }}
      role="img"
      aria-label="Kart over optimalisert salgsrunde"
    />
  );
}
