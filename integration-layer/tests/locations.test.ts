// ── Location/farid API-tester ──

import request from 'supertest';
import { app } from '../src/index';
import { MOCK_SAMPLE_FARID } from '../src/adapters/mockLocationAdapter';

describe('GET /locations/:farid', () => {
  it('returnerer 200 med Location og SourceMeta for kjent farid', async () => {
    const res = await request(app).get(`/locations/${MOCK_SAMPLE_FARID}`);
    expect(res.status).toBe(200);
    expect(res.body.farid).toBe(MOCK_SAMPLE_FARID);
    expect(res.body.buildingId).toBe('building-storgata-12');
    expect(res.body.coord).toEqual({ lat: 59.9139, lon: 10.7522 });
    expect(res.body.adresse).toBe('Storgata 12, H0101');
    expect(Array.isArray(res.body.beboere)).toBe(true);
    expect(res.body.beboere[0].navn).toBe('Anders Hansen');
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.source).toBe('mock');
    expect(res.body.meta.cached).toBe(false);
  });

  it('returnerer cached=true ved cache-treff', async () => {
    await request(app).get(`/locations/${MOCK_SAMPLE_FARID}`);
    const res = await request(app).get(`/locations/${MOCK_SAMPLE_FARID}`);
    expect(res.status).toBe(200);
    expect(res.body.meta.cached).toBe(true);
  });

  it('returnerer 404 for ukjent farid', async () => {
    const res = await request(app).get('/locations/far_doesnotexist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('unknown farid');
  });
});
