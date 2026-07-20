import request from 'supertest';
import { app } from '../src/index';
import { clearAllData } from '../src/db';

const API_KEY = 'test-api-key';

describe('POST /ingest', () => {
  beforeEach(() => {
    clearAllData();
  });

  it('returnerer 400 uten gyldig body', async () => {
    const res = await request(app)
      .post('/ingest')
      .set('X-API-Key', API_KEY)
      .send({ service: 'sales-core' });
    expect(res.status).toBe(400);
  });

  it('returnerer 401 uten API-nøkkel', async () => {
    const res = await request(app)
      .post('/ingest')
      .send({ service: 'sales-core', entries: [] });
    expect(res.status).toBe(401);
  });

  it('lagrer request-logger', async () => {
    const res = await request(app)
      .post('/ingest')
      .set('X-API-Key', API_KEY)
      .send({
        service: 'sales-core',
        entries: [{
          ts: Date.now(),
          type: 'request',
          method: 'GET',
          path: '/api/sdu/rounds',
          status: 200,
          durationMs: 42,
          correlationId: 'corr-test-1',
        }],
      });

    expect(res.status).toBe(200);
    expect(res.body.ingested).toBe(1);

    const logs = await request(app)
      .get('/api/logs?service=sales-core')
      .set('X-API-Key', API_KEY);
    expect(logs.body.logs).toHaveLength(1);
    expect(logs.body.logs[0].path).toBe('/api/sdu/rounds');
  });
});
