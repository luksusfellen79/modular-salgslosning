// ── Tests — route-validator ──
import {
  validateStartRoute,
  validateCompleteRoute,
  findExistingVisit,
  RouteValidationError,
} from '../src/logic/route-validator';
import { RouteAssignment, Visit } from '../src/types';

function makeRoute(overrides: Partial<RouteAssignment> = {}): RouteAssignment {
  return {
    id: 'route-1',
    date: '2026-05-01',
    salesRepId: 'rep-1',
    salesRepName: 'Jonas Mikkelsen',
    buildingIds: ['b1'],
    status: 'planned',
    createdBy: 'planner-1',
    createdAt: '2026-05-01T08:00:00Z',
    ...overrides,
  };
}

function makeVisit(routeId: string, unitId: string): Visit {
  return {
    id: `visit-${unitId}`,
    unitId,
    buildingId: 'b1',
    routeId,
    salesRepId: 'rep-1',
    visitedAt: '2026-05-01T10:00:00Z',
    status: 'no_answer',
  };
}

describe('validateStartRoute', () => {
  it('feil salesRepId → kaster RouteValidationError', () => {
    const route = makeRoute();
    expect(() => validateStartRoute(route, 'rep-wrong')).toThrow(RouteValidationError);
  });

  it('riktig salesRepId og status planned → ingen feil', () => {
    const route = makeRoute();
    expect(() => validateStartRoute(route, 'rep-1')).not.toThrow();
  });

  it('status in_progress → kaster RouteValidationError', () => {
    const route = makeRoute({ status: 'in_progress' });
    expect(() => validateStartRoute(route, 'rep-1')).toThrow(RouteValidationError);
  });

  it('status completed → kaster RouteValidationError', () => {
    const route = makeRoute({ status: 'completed' });
    expect(() => validateStartRoute(route, 'rep-1')).toThrow(RouteValidationError);
  });
});

describe('validateCompleteRoute', () => {
  it('status in_progress → ingen feil', () => {
    const route = makeRoute({ status: 'in_progress' });
    expect(() => validateCompleteRoute(route)).not.toThrow();
  });

  it('status planned → kaster RouteValidationError', () => {
    const route = makeRoute({ status: 'planned' });
    expect(() => validateCompleteRoute(route)).toThrow(RouteValidationError);
  });

  it('status completed → kaster RouteValidationError', () => {
    const route = makeRoute({ status: 'completed' });
    expect(() => validateCompleteRoute(route)).toThrow(RouteValidationError);
  });
});

describe('findExistingVisit', () => {
  it('duplikat visit på samme enhet i samme rute → returnerer eksisterende', () => {
    const visit = makeVisit('route-1', 'u1');
    const result = findExistingVisit([visit], 'route-1', 'u1');
    expect(result).toBe(visit);
  });

  it('ingen match → returnerer undefined', () => {
    const visit = makeVisit('route-1', 'u1');
    expect(findExistingVisit([visit], 'route-1', 'u2')).toBeUndefined();
    expect(findExistingVisit([visit], 'route-2', 'u1')).toBeUndefined();
  });
});
