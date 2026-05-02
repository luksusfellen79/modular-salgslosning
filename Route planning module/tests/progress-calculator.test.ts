// ── Tests — progress-calculator ──
import { calculateRouteProgress } from '../src/logic/progress-calculator';
import { Building, Unit, Visit, VisitStatus } from '../src/types';

const building1: Building = {
  id: 'b1',
  address: 'Testgata 1',
  city: 'Oslo',
  postalCode: '0001',
  totalUnits: 3,
  buildingType: 'apartment_block',
  createdAt: '2026-01-01T00:00:00Z',
};

const building2: Building = {
  id: 'b2',
  address: 'Testgata 2',
  city: 'Oslo',
  postalCode: '0002',
  totalUnits: 2,
  buildingType: 'apartment_block',
  createdAt: '2026-01-01T00:00:00Z',
};

function makeUnit(id: string, buildingId: string): Unit {
  return { id, buildingId, unitNumber: id, floor: 1, isExistingCustomer: false };
}

function makeVisit(unitId: string, buildingId: string, routeId: string, status: VisitStatus): Visit {
  return {
    id: `visit-${unitId}`,
    unitId,
    buildingId,
    routeId,
    salesRepId: 'rep-1',
    visitedAt: '2026-05-01T10:00:00Z',
    status,
  };
}

const units = [
  makeUnit('u1', 'b1'),
  makeUnit('u2', 'b1'),
  makeUnit('u3', 'b1'),
  makeUnit('u4', 'b2'),
  makeUnit('u5', 'b2'),
];

const route = { id: 'route-1', buildingIds: ['b1', 'b2'] };
const buildings = [building1, building2];

describe('calculateRouteProgress', () => {
  it('0 besøk → completionPercent = 0', () => {
    const progress = calculateRouteProgress(route, buildings, units, []);
    expect(progress.completionPercent).toBe(0);
    expect(progress.visitedUnits).toBe(0);
    expect(progress.totalUnits).toBe(5);
  });

  it('alle enheter visited → completionPercent = 100', () => {
    const visits = units.map((u) => makeVisit(u.id, u.buildingId, 'route-1', 'no_answer'));
    const progress = calculateRouteProgress(route, buildings, units, visits);
    expect(progress.completionPercent).toBe(100);
    expect(progress.visitedUnits).toBe(5);
  });

  it('blanding av statuser → riktig fordeling', () => {
    const visits: Visit[] = [
      makeVisit('u1', 'b1', 'route-1', 'no_answer'),
      makeVisit('u2', 'b1', 'route-1', 'not_interested'),
      makeVisit('u3', 'b1', 'route-1', 'interested'),
      makeVisit('u4', 'b2', 'route-1', 'sale_registered'),
    ];
    const progress = calculateRouteProgress(route, buildings, units, visits);
    expect(progress.notAnswered).toBe(1);
    expect(progress.notInterested).toBe(1);
    expect(progress.interested).toBe(1);
    expect(progress.salesRegistered).toBe(1);
    expect(progress.visitedUnits).toBe(4);
    expect(progress.totalUnits).toBe(5);
  });

  it('buildingProgress reflekterer status per bygg korrekt', () => {
    const visits: Visit[] = [
      makeVisit('u1', 'b1', 'route-1', 'no_answer'),
      makeVisit('u2', 'b1', 'route-1', 'not_interested'),
      makeVisit('u3', 'b1', 'route-1', 'interested'),
    ];
    const progress = calculateRouteProgress(route, buildings, units, visits);

    const b1Progress = progress.buildingProgress.find((bp) => bp.buildingId === 'b1');
    const b2Progress = progress.buildingProgress.find((bp) => bp.buildingId === 'b2');

    expect(b1Progress?.status).toBe('completed');
    expect(b1Progress?.visitedUnits).toBe(3);
    expect(b2Progress?.status).toBe('not_started');
    expect(b2Progress?.visitedUnits).toBe(0);
  });

  it('delvis fullført bygg → status in_progress', () => {
    const visits: Visit[] = [makeVisit('u1', 'b1', 'route-1', 'no_answer')];
    const progress = calculateRouteProgress(route, buildings, units, visits);
    const b1Progress = progress.buildingProgress.find((bp) => bp.buildingId === 'b1');
    expect(b1Progress?.status).toBe('in_progress');
  });

  it('existing_customer_upgrade teller som salesRegistered', () => {
    const visits: Visit[] = [makeVisit('u1', 'b1', 'route-1', 'existing_customer_upgrade')];
    const progress = calculateRouteProgress(route, buildings, units, visits);
    expect(progress.salesRegistered).toBe(1);
  });
});
