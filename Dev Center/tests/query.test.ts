import request from 'supertest';
import { app } from '../src/index';
import { clearAllData, insertLogs } from '../src/db';
import { superadminSessionToken } from '../src/auth';

const SESSION_COOKIE = `devcenter_hub_session=${superadminSessionToken()}`;

function authedGet(path: string) {
  return request(app).get(path).set('Cookie', SESSION_COOKIE);
}

async function seedLogs(): Promise<void> {
  const now = Date.now();
  insertLogs([
    { ts: now, service: 'sales-core', type: 'request', method: 'GET', path: '/a', status: 200, correlationId: 'trace-abc' },
    { ts: now + 1, service: 'integration-layer', type: 'request', method: 'GET', path: '/products', status: 200, correlationId: 'trace-abc' },
    { ts: now + 2, service: 'sales-core', type: 'error', method: 'POST', path: '/b', status: 500, correlationId: 'trace-xyz', message: 'db fail' },
    { ts: now + 3, service: 'sales-core', type: 'request', method: 'GET', path: '/c', status: 404, correlationId: 'trace-404' },
  ]);
}

describe('GET /api/logs', () => {
  beforeEach(() => {
    clearAllData();
    seedLogs();
  });

  it('returnerer 403 uten superadmin-session', async () => {
    const res = await request(app).get('/api/logs');
    expect(res.status).toBe(403);
  });

  it('filtrerer på service', async () => {
    const res = await authedGet('/api/logs?service=integration-layer');
    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(1);
    expect(res.body.logs[0].service).toBe('integration-layer');
  });

  it('filtrerer errorsOnly', async () => {
    const res = await authedGet('/api/logs?errorsOnly=true');
    expect(res.body.logs.length).toBeGreaterThanOrEqual(2);
    for (const log of res.body.logs) {
      expect(log.type === 'error' || log.status >= 400).toBe(true);
    }
  });

  it('støtter paginering med before', async () => {
    const all = await authedGet('/api/logs?limit=10');
    const oldestId = all.body.logs[all.body.logs.length - 1].id;

    const page = await authedGet(`/api/logs?before=${oldestId}&limit=2`);
    expect(page.body.logs.length).toBeLessThanOrEqual(2);
    for (const log of page.body.logs) {
      expect(log.id).toBeLessThan(oldestId);
    }
  });
});

describe('GET /api/traces/:correlationId', () => {
  beforeEach(() => {
    clearAllData();
    seedLogs();
  });

  it('returnerer kronologisk trace på tvers av tjenester', async () => {
    const res = await authedGet('/api/traces/trace-abc');
    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(2);
    expect(res.body.events[0].service).toBe('sales-core');
    expect(res.body.events[1].service).toBe('integration-layer');
  });
});

describe('GET /api/logs/:id', () => {
  beforeEach(() => {
    clearAllData();
    seedLogs();
  });

  it('returnerer full detalj inkl stack', async () => {
    const list = await authedGet('/api/logs?service=sales-core');
    const errorLog = list.body.logs.find((l: { type: string }) => l.type === 'error');
    expect(errorLog).toBeDefined();
    const res = await authedGet(`/api/logs/${errorLog.id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('db fail');
  });
});

describe('GET / (dashboard)', () => {
  it('returnerer 403 uten session', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(403);
  });

  it('serverer dashboard med hub_session', async () => {
    const res = await request(app).get(`/?hub_session=${superadminSessionToken()}`);
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']?.[0]).toContain('devcenter_hub_session=');
  });
});
