import { useEffect, useMemo, useState } from 'react';
import { resolveStops } from '../lib/integrationLayer';
import { Round } from '../lib/types';
import { optimizeRoute, Stop } from '../route/optimize';
import { RouteMap } from './RouteMap';

interface RoundRouteViewProps {
  round: Round;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; stops: Stop[]; missing: string[] };

function uniqueBuildingIdsInOrder(round: Round): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const unit of round.units) {
    if (!seen.has(unit.buildingId)) {
      seen.add(unit.buildingId);
      ids.push(unit.buildingId);
    }
  }
  return ids;
}

export function RoundRouteView({ round }: RoundRouteViewProps) {
  const buildingIdsKey = round.units.map((u) => u.buildingId).join('\0');
  const buildingIds = useMemo(
    () => uniqueBuildingIdsInOrder(round),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on building set, not unit status
    [buildingIdsKey],
  );
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [startBuildingId, setStartBuildingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoad({ status: 'loading' });
    setStartBuildingId(null);

    void resolveStops(buildingIds)
      .then(({ stops, missing }) => {
        if (cancelled) return;
        setLoad({ status: 'ready', stops, missing });
        const firstInRoundOrder = buildingIds.find((id) =>
          stops.some((s) => s.buildingId === id),
        );
        setStartBuildingId(firstInRoundOrder ?? stops[0]?.buildingId ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoad({
          status: 'error',
          message: err instanceof Error ? err.message : 'Kunne ikke hente koordinater',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [buildingIds]);

  if (load.status === 'loading') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        Henter byggkoordinater…
      </div>
    );
  }

  if (load.status === 'error') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
        {load.message}
      </div>
    );
  }

  const { stops, missing } = load;

  if (stops.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-800">
        Ingen bygg med koordinater i Integration Layer.
        {missing.length > 0 && (
          <div className="mt-2 text-xs text-amber-700">
            Mangler: {missing.join(', ')}
          </div>
        )}
      </div>
    );
  }

  const startStop = stops.find((s) => s.buildingId === startBuildingId) ?? stops[0];
  const routeStops = stops.filter((s) => s.buildingId !== startStop.buildingId);
  const route = optimizeRoute({ start: startStop.coord, stops: routeStops });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Optimalisert rute
          </div>
          <div className="mt-1 text-sm text-slate-700">
            <span className="font-semibold">{route.order.length}</span> stopp
            {' · '}
            <span className="font-semibold">{route.totalDistanceKm.toFixed(1)}</span> km
            <span className="text-slate-400"> (rundtur)</span>
          </div>
        </div>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
          Startpunkt
          <select
            value={startStop.buildingId}
            onChange={(e) => setStartBuildingId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"
          >
            {stops.map((s) => (
              <option key={s.buildingId} value={s.buildingId}>
                {s.buildingId}
              </option>
            ))}
          </select>
        </label>
      </div>

      {missing.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {missing.length} bygg mangler koordinater i IL: {missing.join(', ')}
        </div>
      )}

      <RouteMap
        start={startStop.coord}
        order={route.order}
        className="h-[500px] w-full overflow-hidden rounded-xl border border-slate-200"
      />
    </div>
  );
}
