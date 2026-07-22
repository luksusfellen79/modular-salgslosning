// ── Location/farid API-tester ──

import request from 'supertest';
import { app } from '../src/index';
import {
  MOCK_SAMPLE_BUILDING_ID,
  MOCK_SAMPLE_BUILDING_UNIT_COUNT,
  MOCK_SAMPLE_FARID,
  MOCK_SAMPLE_FARID_2,
  MOCK_SAMPLE_FARID_3,
  MOCK_SAMPLE_FARID_EKEBERG,
  MOCK_SAMPLE_FARID_OTHER_BUILDING,
} from '../src/adapters/mockLocationAdapter';

describe('GET /locations/:farid', () => {
  it('returnerer 200 med Location og SourceMeta for kjent farid', async () => {
    const res = await request(app).get(`/locations/${MOCK_SAMPLE_FARID}`);
    expect(res.status).toBe(200);
    expect(res.body.farid).toBe(MOCK_SAMPLE_FARID);
    expect(res.body.buildingId).toBe(MOCK_SAMPLE_BUILDING_ID);
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

describe('GET /buildings/:buildingId/locations', () => {
  it('returnerer riktig antall boenheter for seedet bygg', async () => {
    const res = await request(app).get(`/buildings/${MOCK_SAMPLE_BUILDING_ID}/locations`);
    expect(res.status).toBe(200);
    expect(res.body.buildingId).toBe(MOCK_SAMPLE_BUILDING_ID);
    expect(res.body.count).toBe(MOCK_SAMPLE_BUILDING_UNIT_COUNT);
    expect(res.body.locations).toHaveLength(MOCK_SAMPLE_BUILDING_UNIT_COUNT);
    expect(res.body.coord).toEqual({ lat: 59.9139, lon: 10.7522 });
    expect(res.body.meta.source).toBe('mock');
  });

  it('alle locations deler samme coord', async () => {
    const res = await request(app).get(`/buildings/${MOCK_SAMPLE_BUILDING_ID}/locations`);
    expect(res.status).toBe(200);
    const expected = res.body.coord;
    for (const loc of res.body.locations) {
      expect(loc.coord).toEqual(expected);
      expect(loc.buildingId).toBe(MOCK_SAMPLE_BUILDING_ID);
    }
  });

  it('returnerer 200 med tom liste for ukjent buildingId', async () => {
    const res = await request(app).get('/buildings/building-finnes-ikke/locations');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
    expect(res.body.coord).toBeNull();
    expect(res.body.locations).toEqual([]);
  });
});

describe('POST /locations/batch', () => {
  it('returnerer kjente farids gruppert på bygg', async () => {
    const res = await request(app)
      .post('/locations/batch')
      .send({ farids: [MOCK_SAMPLE_FARID, MOCK_SAMPLE_FARID_2, MOCK_SAMPLE_FARID_OTHER_BUILDING] });

    expect(res.status).toBe(200);
    expect(res.body.requested).toBe(3);
    expect(res.body.resolved).toBe(3);
    expect(res.body.unknownFarids).toEqual([]);
    expect(res.body.buildings).toHaveLength(2);

    const storgata = res.body.buildings.find(
      (b: { buildingId: string }) => b.buildingId === MOCK_SAMPLE_BUILDING_ID,
    );
    expect(storgata).toBeDefined();
    expect(storgata.locations).toHaveLength(2);
    expect(storgata.coord).toEqual({ lat: 59.9139, lon: 10.7522 });

    const kirkeveien = res.body.buildings.find(
      (b: { buildingId: string }) => b.buildingId === 'building-kirkeveien-45',
    );
    expect(kirkeveien).toBeDefined();
    expect(kirkeveien.locations).toHaveLength(1);
  });

  it('legger ukjente farids i unknownFarids', async () => {
    const res = await request(app)
      .post('/locations/batch')
      .send({ farids: [MOCK_SAMPLE_FARID, 'far_unknown_xyz'] });

    expect(res.status).toBe(200);
    expect(res.body.requested).toBe(2);
    expect(res.body.resolved).toBe(1);
    expect(res.body.unknownFarids).toEqual(['far_unknown_xyz']);
    expect(res.body.buildings).toHaveLength(1);
    expect(res.body.buildings[0].locations[0].farid).toBe(MOCK_SAMPLE_FARID);
  });

  it('teller duplikate farids én gang', async () => {
    const res = await request(app)
      .post('/locations/batch')
      .send({ farids: [MOCK_SAMPLE_FARID, MOCK_SAMPLE_FARID, MOCK_SAMPLE_FARID_2] });

    expect(res.status).toBe(200);
    expect(res.body.requested).toBe(2);
    expect(res.body.resolved).toBe(2);
    expect(res.body.unknownFarids).toEqual([]);
  });

  it('returnerer 400 for tom array', async () => {
    const res = await request(app).post('/locations/batch').send({ farids: [] });
    expect(res.status).toBe(400);
  });

  it('returnerer 400 for over 1000 farids', async () => {
    const farids = Array.from({ length: 1001 }, (_, i) => `far_bulk_${i}`);
    const res = await request(app).post('/locations/batch').send({ farids });
    expect(res.status).toBe(400);
  });

  it('setter meta.cached=true ved andre kall med samme farids', async () => {
    // Bruk farids som ikke er varmet av tidligere tester i denne filen
    const payload = { farids: [MOCK_SAMPLE_FARID_3, MOCK_SAMPLE_FARID_EKEBERG] };

    const first = await request(app).post('/locations/batch').send(payload);
    expect(first.status).toBe(200);
    expect(first.body.meta.cached).toBe(false);
    expect(first.body.resolved).toBe(2);

    const second = await request(app).post('/locations/batch').send(payload);
    expect(second.status).toBe(200);
    expect(second.body.meta.cached).toBe(true);
    expect(second.body.resolved).toBe(2);
  });
});
