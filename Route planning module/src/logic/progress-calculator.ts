// ── ProgressCalculator — beregner RouteProgress fra visits ──
import { Building, Unit, Visit, RouteProgress, BuildingProgress } from '../types';

export function calculateRouteProgress(
  route: { id: string; buildingIds: string[] },
  buildings: Building[],
  units: Unit[],
  visits: Visit[]
): RouteProgress {
  const routeVisits = visits.filter((v) => v.routeId === route.id);
  const visitMap = new Map<string, Visit>(routeVisits.map((v) => [v.unitId, v]));

  let totalUnits = 0;
  let visitedUnits = 0;
  let notAnswered = 0;
  let notInterested = 0;
  let interested = 0;
  let salesRegistered = 0;

  const buildingProgress: BuildingProgress[] = [];

  for (const buildingId of route.buildingIds) {
    const building = buildings.find((b) => b.id === buildingId);
    if (!building) continue;

    const buildingUnits = units.filter((u) => u.buildingId === buildingId);
    let bVisited = 0;
    let bSales = 0;

    for (const unit of buildingUnits) {
      totalUnits++;
      const visit = visitMap.get(unit.id);
      if (!visit || visit.status === 'not_visited') continue;

      visitedUnits++;
      bVisited++;

      switch (visit.status) {
        case 'no_answer':
          notAnswered++;
          break;
        case 'not_interested':
          notInterested++;
          break;
        case 'interested':
          interested++;
          break;
        case 'sale_registered':
        case 'existing_customer_upgrade':
          salesRegistered++;
          bSales++;
          break;
        case 'existing_customer_no_change':
          break;
      }
    }

    const bTotal = buildingUnits.length;
    let bStatus: BuildingProgress['status'] = 'not_started';
    if (bVisited > 0 && bVisited < bTotal) bStatus = 'in_progress';
    if (bTotal > 0 && bVisited >= bTotal) bStatus = 'completed';

    buildingProgress.push({
      buildingId,
      address: building.address,
      totalUnits: bTotal,
      visitedUnits: bVisited,
      salesRegistered: bSales,
      status: bStatus,
    });
  }

  const completionPercent = totalUnits === 0 ? 0 : Math.round((visitedUnits / totalUnits) * 100);

  return {
    routeId: route.id,
    totalUnits,
    visitedUnits,
    notAnswered,
    notInterested,
    interested,
    salesRegistered,
    completionPercent,
    buildingProgress,
  };
}
