// ── SLA unit tests ──
import { calculateSlaDeadline } from '../src/services/slaService';

describe('slaService', () => {
  it('returns null when SLA disabled', () => {
    expect(calculateSlaDeadline(new Date(), 8, false)).toBeNull();
  });

  it('adds sla hours to created time', () => {
    const created = new Date('2026-05-24T10:00:00Z');
    const deadline = calculateSlaDeadline(created, 4, true);
    expect(deadline).toBe('2026-05-24T14:00:00.000Z');
  });
});
