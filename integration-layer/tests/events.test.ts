// ── EventBus integration tests ──
import request from 'supertest';
import { app } from '../src/index';
import { clearBonusesForTests } from '../src/bonus/BonusLedger';

describe('EventBus integration chain', () => {
  beforeEach(() => {
    clearBonusesForTests();
  });

  it('POST /events/publish visit.completed (sold) triggers bonus.calculated', async () => {
    const publishRes = await request(app)
      .post('/events/publish')
      .send({
        topic: 'visit.completed',
        source: 'sales-core',
        payload: {
          unitId: 'building-storgata-12-h0304',
          buildingId: 'building-storgata-12',
          outcome: 'sold',
          salesRepName: 'Kari Nordmann',
          roundId: 'rnd-test-001',
          soldProducts: ['Fiber 500/500'],
        },
      });

    expect(publishRes.status).toBe(202);
    expect(publishRes.body.published).toBe(true);

    const bonusRes = await request(app).get('/bonuses?limit=5');
    expect(bonusRes.status).toBe(200);
    expect(bonusRes.body.bonuses.length).toBeGreaterThan(0);
    expect(bonusRes.body.bonuses[0].totalBonusKr).toBe(200);
    expect(bonusRes.body.bonuses[0].sellerName).toBe('Kari Nordmann');
  });

  it('GET /events/log lists published visit.completed', async () => {
    await request(app)
      .post('/events/publish')
      .send({
        topic: 'visit.completed',
        source: 'sdu-crm',
        payload: { unitId: 'u1', buildingId: 'b1', outcome: 'no_answer' },
      });

    const logRes = await request(app).get('/events/log?topic=visit.completed');
    expect(logRes.status).toBe(200);
    expect(logRes.body.count).toBeGreaterThan(0);
  });

  it('rejects unknown topic', async () => {
    const res = await request(app)
      .post('/events/publish')
      .send({ topic: 'unknown.topic', source: 'test', payload: {} });
    expect(res.status).toBe(400);
  });

  it('accepts case.created topic', async () => {
    const res = await request(app)
      .post('/events/publish')
      .send({
        topic: 'case.created',
        source: 'case-service',
        payload: { caseId: 'c1', saksnummer: 'CS-2026-00001', typeKode: 'FIBER_FEIL' },
      });
    expect(res.status).toBe(202);
    expect(res.body.published).toBe(true);
  });

  it('accepts failure topic order.failed', async () => {
    const res = await request(app)
      .post('/events/publish')
      .send({
        topic: 'order.failed',
        source: 'sales-core',
        payload: { orderId: 'ord-1', error: 'Ordre avvist' },
      });
    expect(res.status).toBe(202);
    expect(res.body.published).toBe(true);
  });

  it('GET /events/topics includes case and failure topics', async () => {
    const res = await request(app).get('/events/topics');
    expect(res.status).toBe(200);
    expect(res.body.topics).toContain('case.created');
    expect(res.body.topics).toContain('case.sla_breached');
    expect(res.body.topics).toContain('order.failed');
    expect(res.body.topics).toContain('fiber.failed');
  });
});
