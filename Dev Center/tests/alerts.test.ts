import { clearAllData, insertLogs } from '../src/db';
import { evaluateAlerts, resetAlertStateForTests, getAlertThresholds } from '../src/alerts/engine';
import { db } from '../src/db';

describe('evaluateAlerts', () => {
  beforeEach(() => {
    clearAllData();
    resetAlertStateForTests();
  });

  it('oppretter alert ved høy feilrate og min antall feil', () => {
    const now = Date.now();
    const entries = Array.from({ length: 10 }, (_, i) => ({
      ts: now - i * 1000,
      service: 'sales-core',
      type: (i < 5 ? 'error' : 'request') as 'error' | 'request',
      method: 'GET',
      path: '/fail',
      status: i < 5 ? 500 : 200,
    }));
    insertLogs(entries);

    evaluateAlerts('sales-core', now);

    const alerts = db.prepare('SELECT * FROM alerts WHERE service = ?').all('sales-core');
    expect(alerts).toHaveLength(1);
    expect((alerts[0] as { rule: string }).rule).toBe('error-rate');
  });

  it('respekterer cooldown mellom alerts', () => {
    const now = Date.now();
    const { cooldownMs } = getAlertThresholds();
    const entries = Array.from({ length: 10 }, () => ({
      ts: now,
      service: 'sales-core',
      type: 'error' as const,
      status: 500,
    }));
    insertLogs(entries);

    evaluateAlerts('sales-core', now);
    evaluateAlerts('sales-core', now + 1000);

    let alerts = db.prepare('SELECT * FROM alerts').all();
    expect(alerts).toHaveLength(1);

    const later = now + cooldownMs + 1;
    insertLogs(entries.map((e) => ({ ...e, ts: later })));
    evaluateAlerts('sales-core', later);
    alerts = db.prepare('SELECT * FROM alerts').all();
    expect(alerts).toHaveLength(2);
  });

  it('utløser ikke alert under terskel', () => {
    const now = Date.now();
    insertLogs([
      { ts: now, service: 'sales-core', type: 'error', status: 500 },
      { ts: now, service: 'sales-core', type: 'request', status: 200 },
      { ts: now, service: 'sales-core', type: 'request', status: 200 },
      { ts: now, service: 'sales-core', type: 'request', status: 200 },
      { ts: now, service: 'sales-core', type: 'request', status: 200 },
    ]);

    evaluateAlerts('sales-core', now);
    const alerts = db.prepare('SELECT * FROM alerts').all();
    expect(alerts).toHaveLength(0);
  });
});
