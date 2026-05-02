// ── Tests — full visit-flyt ──
import { calculateRouteProgress } from '../src/logic/progress-calculator';
import { InMemoryEventBus } from '../src/events/in-memory-event-bus';
import { Building, Unit, Visit, RouteAssignment, VisitStatus } from '../src/types';

function makeBuilding(id: string, totalUnits: number): Building {
  return {
    id,
    address: `Testgata ${id}`,
    city: 'Oslo',
    postalCode: '0001',
    totalUnits,
    buildingType: 'apartment_block',
    createdAt: '2026-01-01T00:00:00Z',
  };
}

function makeUnit(id: string, buildingId: string): Unit {
  return { id, buildingId, unitNumber: id, floor: 1, isExistingCustomer: false };
}

function makeRoute(buildingIds: string[]): RouteAssignment {
  return {
    id: 'test-route',
    date: '2026-05-01',
    salesRepId: 'rep-1',
    salesRepName: 'Jonas',
    buildingIds,
    status: 'in_progress',
    createdBy: 'planner-1',
    createdAt: '2026-05-01T08:00:00Z',
  };
}

function makeVisit(unitId: string, buildingId: string, status: VisitStatus): Visit {
  return {
    id: `visit-${unitId}`,
    unitId,
    buildingId,
    routeId: 'test-route',
    salesRepId: 'rep-1',
    visitedAt: '2026-05-01T10:00:00Z',
    status,
  };
}

describe('full visit-flyt', () => {
  const building = makeBuilding('b1', 3);
  const units = [makeUnit('u1', 'b1'), makeUnit('u2', 'b1'), makeUnit('u3', 'b1')];
  const route = makeRoute(['b1']);

  it('opprett rute → start → logg besøk på alle enheter → verifiser BuildingProgress', () => {
    const visits: Visit[] = [
      makeVisit('u1', 'b1', 'no_answer'),
      makeVisit('u2', 'b1', 'interested'),
      makeVisit('u3', 'b1', 'sale_registered'),
    ];

    const progress = calculateRouteProgress(route, [building], units, visits);
    const bp = progress.buildingProgress[0];

    expect(bp?.status).toBe('completed');
    expect(bp?.visitedUnits).toBe(3);
    expect(bp?.salesRegistered).toBe(1);
    expect(progress.completionPercent).toBe(100);
  });

  it('status interested → event sale_interest_registered publiseres', async () => {
    const eventBus = new InMemoryEventBus();
    const published: { event: string; payload: unknown }[] = [];
    eventBus.subscribe('sale_interest_registered', async (payload) => {
      published.push({ event: 'sale_interest_registered', payload });
    });

    await eventBus.publish('sale_interest_registered', {
      routeId: 'test-route',
      unitId: 'u2',
      salesRepId: 'rep-1',
      interestedProducts: ['Fiber 500'],
    });

    expect(published).toHaveLength(1);
    expect(published[0]?.event).toBe('sale_interest_registered');
    expect((published[0]?.payload as Record<string, unknown>).unitId).toBe('u2');
  });

  it('alle bygg completed → event route_completed publiseres', async () => {
    const eventBus = new InMemoryEventBus();
    const published: { event: string; payload: unknown }[] = [];
    eventBus.subscribe('route_completed', async (payload) => {
      published.push({ event: 'route_completed', payload });
    });

    const visits: Visit[] = [
      makeVisit('u1', 'b1', 'no_answer'),
      makeVisit('u2', 'b1', 'not_interested'),
      makeVisit('u3', 'b1', 'sale_registered'),
    ];

    const progress = calculateRouteProgress(route, [building], units, visits);
    const allCompleted = progress.buildingProgress.every((bp) => bp.status === 'completed');

    if (allCompleted) {
      await eventBus.publish('route_completed', { routeId: route.id, salesRepId: route.salesRepId });
    }

    expect(published).toHaveLength(1);
    expect(published[0]?.event).toBe('route_completed');
  });

  it('delvis fullført → route_completed publiseres ikke', async () => {
    const eventBus = new InMemoryEventBus();
    const published: unknown[] = [];
    eventBus.subscribe('route_completed', async (payload) => {
      published.push(payload);
    });

    const visits: Visit[] = [makeVisit('u1', 'b1', 'no_answer')];
    const progress = calculateRouteProgress(route, [building], units, visits);
    const allCompleted = progress.buildingProgress.every((bp) => bp.status === 'completed');

    if (allCompleted) {
      await eventBus.publish('route_completed', { routeId: route.id });
    }

    expect(published).toHaveLength(0);
  });
});
