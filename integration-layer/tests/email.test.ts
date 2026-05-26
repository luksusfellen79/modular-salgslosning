// ── EmailAdapter tests ──
import request from 'supertest';
import { app } from '../src/index';

describe('EmailAdapter', () => {
  it('GET /adapters/email/health returns disabled provider', async () => {
    const res = await request(app).get('/adapters/email/health');
    expect(res.status).toBe(200);
    expect(res.body.adapter).toBe('EmailAdapter');
    expect(res.body.provider).toBe('disabled');
    expect(res.body.healthy).toBe(true);
  });

  it('POST /adapters/email/send skips when disabled', async () => {
    const res = await request(app)
      .post('/adapters/email/send')
      .send({
        to: 'test@telenor.no',
        subject: 'Test',
        body: 'Hei',
      });

    expect(res.status).toBe(200);
    expect(res.body.sent).toBe(false);
    expect(res.body.skipped).toBe(true);
    expect(res.body.provider).toBe('disabled');
  });

  it('POST /adapters/email/send rejects missing fields', async () => {
    const res = await request(app)
      .post('/adapters/email/send')
      .send({ to: 'test@telenor.no' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MANGLER_FELT');
  });
});
