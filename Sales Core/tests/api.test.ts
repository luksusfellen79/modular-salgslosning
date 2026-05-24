// ── API integration tests ──
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';

describe('API routes', () => {
  let app: any;
  let tempRoot: string;

  beforeAll(async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sales-core-api-'));
    process.env.DATA_DIR = path.join(tempRoot, 'data');
    process.env.SALES_CORE_BASE_URL = 'http://localhost:3005';
    delete process.env.DATABASE_URL;
    const module = await import('../src/index');
    app = module.app;
    await module.waitForReady();
  });

  afterAll(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('GET /health returns healthy counts', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'healthy', opportunities: 5, offers: 0 });
  });

  test('GET /api/opportunities returns seed opportunities', async () => {
    const response = await request(app).get('/api/opportunities');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(5);
  });

  test('GET /api/opportunities?stage=proposal filters results', async () => {
    const response = await request(app).get('/api/opportunities').query({ stage: 'proposal' });
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].stage).toBe('proposal');
  });

  test('GET /api/opportunities/:id returns existing opportunity', async () => {
    const response = await request(app).get('/api/opportunities/opp-001');
    expect(response.status).toBe(200);
    expect(response.body.id).toBe('opp-001');
  });

  test('GET /api/opportunities/:id returns 404 for missing id', async () => {
    const response = await request(app).get('/api/opportunities/unknown-id');
    expect(response.status).toBe(404);
  });

  test('POST /api/offers creates a draft offer with tracking data', async () => {
    const response = await request(app).post('/api/offers').send({
      opportunityId: 'opp-005',
      accountName: 'Torget Sameie',
      contactName: 'Ole Strand',
      contactEmail: 'ole.strand@torget.no',
      packageId: 'pkg-test',
      packageName: 'Testpakke',
      selectedProducts: ['prod-1'],
      monthlyPricePerUnit: 250,
      discountPercent: 5,
      units: 90,
      notes: 'Test tilbud',
      salesRepName: 'Test Selger',
      validUntil: '2026-09-30',
    });

    expect(response.status).toBe(201);
    expect(response.body.trackingToken).toBeTruthy();
    expect(response.body.trackingUrl).toContain('/track/');
  });

  test('POST /api/offers/:id/send marks offer as sent', async () => {
    const createResponse = await request(app).post('/api/offers').send({
      opportunityId: 'opp-005',
      accountName: 'Torget Sameie',
      contactName: 'Ole Strand',
      contactEmail: 'ole.strand@torget.no',
      packageId: 'pkg-test2',
      packageName: 'Send testpakke',
      selectedProducts: ['prod-2'],
      monthlyPricePerUnit: 300,
      discountPercent: 8,
      units: 90,
      notes: 'Send test',
      salesRepName: 'Test Selger',
      validUntil: '2026-09-30',
    });
    expect(createResponse.status).toBe(201);
    const offerId = createResponse.body.id;

    const sendResponse = await request(app).post(`/api/offers/${offerId}/send`);
    expect(sendResponse.status).toBe(200);
    expect(sendResponse.body.status).toBe('sent');
  });

  test('GET /api/offers/by-token/:token returns offer by token', async () => {
    const offersFile = path.join(process.env.DATA_DIR as string, 'offers.json');
    const offers = JSON.parse(fs.readFileSync(offersFile, 'utf-8'));
    const token = offers[0]?.trackingToken;
    expect(token).toBeTruthy();

    const response = await request(app).get(`/api/offers/by-token/${token}`);
    expect(response.status).toBe(200);
    expect(response.body.trackingUrl).toContain(`/track/${token}`);
  });

  test('POST /track/:trackingToken/respond returns success true', async () => {
    const offersFile = path.join(process.env.DATA_DIR as string, 'offers.json');
    const offers = JSON.parse(fs.readFileSync(offersFile, 'utf-8'));
    const offer = offers.find((item: any) => item.status === 'sent');
    expect(offer).toBeTruthy();

    const response = await request(app)
      .post(`/track/${offer.trackingToken}/respond`)
      .send({ action: 'accepted' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, status: 'accepted' });
  });

  test('GET /api/offers/:id/events returns an array of events', async () => {
    const offersFile = path.join(process.env.DATA_DIR as string, 'offers.json');
    const offers = JSON.parse(fs.readFileSync(offersFile, 'utf-8'));
    const offerId = offers[0]?.id;
    expect(offerId).toBeTruthy();

    const response = await request(app).get(`/api/offers/${offerId}/events`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
