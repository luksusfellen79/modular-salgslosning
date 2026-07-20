import express from 'express';
import request from 'supertest';
import {
  initDevCenter,
  requestLogger,
  resetDevCenterForTests,
} from '../middleware/devcenter-middleware';

describe('devcenter middleware', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetDevCenterForTests();
    process.env.DEVCENTER_URL = 'http://dev-center.test';
    process.env.DEVCENTER_API_KEY = 'secret';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.DEVCENTER_URL;
    delete process.env.DEVCENTER_API_KEY;
    resetDevCenterForTests();
  });

  it('kaster ikke når Dev Center er nede', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;

    initDevCenter('test-service');
    const app = express();
    app.use(express.json());
    app.use(requestLogger());
    app.get('/ok', (_req, res) => res.json({ ok: true }));

    const res = await request(app).get('/ok');
    expect(res.status).toBe(200);
    expect(res.headers['x-correlation-id']).toBeDefined();
  });

  it('propagerer innkommende correlation ID', async () => {
    initDevCenter('test-service');
    const app = express();
    app.use(express.json());
    app.use(requestLogger());
    app.get('/echo', (req, res) => {
      res.json({ correlationId: req.header('x-correlation-id') });
    });

    const res = await request(app)
      .get('/echo')
      .set('x-correlation-id', 'incoming-corr-123');
    expect(res.status).toBe(200);
    expect(res.headers['x-correlation-id']).toBe('incoming-corr-123');
  });
});
