// ── API integration tests (in-memory) ──
import request from 'supertest';
import { memoryReset } from '../src/db/memoryStore';

describe('Case Service API', () => {
  let app: typeof import('../src/index').app;

  beforeAll(async () => {
    delete process.env.DATABASE_URL;
    process.env.CASE_SERVICE_MEMORY = 'true';
    memoryReset();
    const mod = await import('../src/index');
    app = mod.app;
  });

  test('GET /health returns healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.storage).toBe('memory');
  });

  test('GET /api/typer returns 7 case types', async () => {
    const res = await request(app).get('/api/typer');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(7);
  });

  test('POST /api/cases creates and routes case', async () => {
    const res = await request(app).post('/api/cases').send({
      typeKode: 'FIBER_FEIL',
      tittel: 'Fiber nede Storgata 12',
      beskrivelse: 'Ingen signal på H0304',
      kundeNavn: 'Ola Nordmann',
    });
    expect(res.status).toBe(201);
    expect(res.body.saksnummer).toMatch(/^CS-/);
    expect(res.body.typeKode).toBe('FIBER_FEIL');
    expect(res.body.tildeltGruppe).toBe('teknisk-fiber');
    expect(res.body.status).toBe('TILDELT');
  });

  test('full case lifecycle', async () => {
    const create = await request(app).post('/api/cases').send({
      typeKode: 'KUNDEHENVENDELSE',
      tittel: 'Kunde ringer om faktura',
    });
    const id = create.body.id;

    await request(app).post(`/api/cases/${id}/take`).send({ brukerId: 'u1', brukerNavn: 'Kari' }).expect(200);
    await request(app).post(`/api/cases/${id}/start`).send({ brukerId: 'u1', brukerNavn: 'Kari' }).expect(200);
    await request(app).post(`/api/cases/${id}/resolve`).send({ kommentar: 'Løst' }).expect(200);
    const closed = await request(app).post(`/api/cases/${id}/close`).send({ kommentar: 'Lukket' });
    expect(closed.body.status).toBe('LUKKET');

    const events = await request(app).get(`/api/cases/${id}/hendelser`);
    expect(events.body.length).toBeGreaterThan(0);
  });

  test('POST /cases alias works', async () => {
    const res = await request(app).post('/cases').send({
      typeKode: 'ORDER_FEIL',
      tittel: 'Ordre feilet',
    });
    expect(res.status).toBe(201);
    expect(res.body.typeKode).toBe('ORDER_FEIL');
  });

  test('GET /api/queue/:gruppe filters queue', async () => {
    const res = await request(app).get('/api/queue/teknisk-fiber');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.cases)).toBe(true);
  });
});
