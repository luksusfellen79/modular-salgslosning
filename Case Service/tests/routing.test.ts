// ── Routing unit tests ──
import { FAILURE_TOPIC_TO_CASE_TYPE, inferCaseTypeFromEvent } from '../src/services/routingService';

describe('routingService', () => {
  it('maps failure topics to case types', () => {
    expect(FAILURE_TOPIC_TO_CASE_TYPE['fiber.failed']).toBe('FIBER_FEIL');
    expect(FAILURE_TOPIC_TO_CASE_TYPE['order.failed']).toBe('ORDER_FEIL');
  });

  it('infers type from payload.caseType', () => {
    expect(inferCaseTypeFromEvent('unknown.event', { caseType: 'MOBILFEIL' })).toBe('MOBILFEIL');
  });

  it('infers type from errorDomain', () => {
    expect(inferCaseTypeFromEvent('integration.error', { errorDomain: 'fiber-provision' })).toBe('FIBER_FEIL');
  });

  it('returns null for unrelated events', () => {
    expect(inferCaseTypeFromEvent('visit.completed', { outcome: 'sold' })).toBeNull();
  });
});
