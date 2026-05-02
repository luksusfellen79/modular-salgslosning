// ── RouteValidator — forretningsregler for ruter og besøk ──
import { RouteAssignment, Visit } from '../types';

export class RouteValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RouteValidationError';
  }
}

export function validateStartRoute(route: RouteAssignment, salesRepId: string): void {
  if (route.salesRepId !== salesRepId) {
    throw new RouteValidationError(
      `Ruten er tildelt ${route.salesRepName}, ikke ${salesRepId}`
    );
  }
  if (route.status !== 'planned') {
    throw new RouteValidationError(
      `Ruten kan ikke startes — status er allerede '${route.status}'`
    );
  }
}

export function validateCompleteRoute(route: RouteAssignment): void {
  if (route.status !== 'in_progress') {
    throw new RouteValidationError(
      `Ruten kan ikke fullføres — status er '${route.status}', forventet 'in_progress'`
    );
  }
}

export function findExistingVisit(
  visits: Visit[],
  routeId: string,
  unitId: string
): Visit | undefined {
  return visits.find((v) => v.routeId === routeId && v.unitId === unitId);
}
