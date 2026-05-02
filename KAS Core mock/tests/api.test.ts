// ── API endpoint tests ──
import request from 'supertest';
import { createApp } from '../src/index';
import { customers, residents } from '../src/seed';

const app = createApp();

describe('API endpoints', () => {
  it('returns health status with resident and customer counts', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'healthy',
      residents: 54,
      customers: customers.length,
    });
  });

  it('returns 24 resident summaries for building-storgata-12', async () => {
    const response = await request(app).get('/buildings/building-storgata-12/residents');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(24);
    expect(response.body[0]).toEqual(
      expect.objectContaining({
        unitId: expect.any(String),
        name: expect.any(String),
        isExistingCustomer: expect.any(Boolean),
        existingProducts: expect.any(Array),
      }),
    );
  });

  it('returns a full resident for a valid unitId', async () => {
    const resident = residents[0];
    const response = await request(app).get(`/residents/${resident.unitId}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ unitId: resident.unitId, name: resident.name }));
  });

  it('returns 404 for an unknown resident unitId', async () => {
    const response = await request(app).get('/residents/ukjent-id');
    expect(response.status).toBe(404);
  });

  it('returns a full customer for a valid customerId', async () => {
    const customer = customers[0];
    const response = await request(app).get(`/customers/${customer.customerId}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ customerId: customer.customerId, name: customer.name }));
  });

  it('returns only customers for building-kirkeveien-45', async () => {
    const response = await request(app).get('/customers').query({ buildingId: 'building-kirkeveien-45' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.arrayContaining([]));
    expect(response.body.every((item: any) => item.buildingId === 'building-kirkeveien-45')).toBe(true);
  });

  it('searches case-insensitive by name', async () => {
    const response = await request(app).get('/search').query({ q: 'hansen' });
    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body.some((resident: any) => /hansen/i.test(resident.name))).toBe(true);
  });
});
