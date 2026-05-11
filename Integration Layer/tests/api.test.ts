// ── API-tester for Integration Layer ──

import request from 'supertest';
import { app, registry } from '../src/index';

describe('GET /health', () => {
  it('returnerer 200 og status healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(Array.isArray(res.body.adapters)).toBe(true);
    expect(res.body.adapters.length).toBeGreaterThan(0);
  });

  it('alle adaptere rapporterer healthy', async () => {
    const res = await request(app).get('/health');
    const unhealthy = res.body.adapters.filter((a: { healthy: boolean }) => !a.healthy);
    expect(unhealthy).toHaveLength(0);
  });
});

describe('GET /products', () => {
  it('returnerer produkter fra alle adaptere', async () => {
    const res = await request(app).get('/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('produkter har source-metadata', async () => {
    const res = await request(app).get('/products');
    for (const product of res.body) {
      expect(product.meta).toBeDefined();
      expect(product.meta.source).toBeDefined();
      expect(product.meta.fetchedAt).toBeDefined();
    }
  });

  it('inneholder produkter fra fiber, mobil og tv', async () => {
    const res = await request(app).get('/products');
    const categories = new Set(res.body.map((p: { category: string }) => p.category));
    expect(categories.has('fiber')).toBe(true);
    expect(categories.has('mobile')).toBe(true);
    expect(categories.has('tv')).toBe(true);
  });
});

describe('GET /products/:productId', () => {
  it('returnerer et spesifikt produkt', async () => {
    const res = await request(app).get('/products/fiber-500');
    expect(res.status).toBe(200);
    expect(res.body.productId).toBe('fiber-500');
  });

  it('returnerer 404 for ukjent produkt', async () => {
    const res = await request(app).get('/products/ukjent-produkt-xyz');
    expect(res.status).toBe(404);
  });
});

describe('GET /products/available/check', () => {
  it('returnerer tilgjengelighetsresultat med prissatte produkter', async () => {
    const res = await request(app).get('/products/available/check?buildingId=building-storgata-12');
    expect(res.status).toBe(200);
    expect(res.body.products).toBeDefined();
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.checkedAt).toBeDefined();
  });

  it('alle prissatte produkter har finalPrice', async () => {
    const res = await request(app).get('/products/available/check');
    for (const p of res.body.products) {
      expect(typeof p.finalPrice).toBe('number');
    }
  });
});

describe('GET /buildings/:buildingId/residents', () => {
  it('returnerer 24 ResidentSummary for Storgata 12', async () => {
    const res = await request(app).get('/buildings/building-storgata-12/residents');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(24);
  });

  it('returnerer 18 beboere for Kirkeveien 45', async () => {
    const res = await request(app).get('/buildings/building-kirkeveien-45/residents');
    expect(res.body).toHaveLength(18);
  });

  it('returnerer 12 beboere for Ekebergveien 14', async () => {
    const res = await request(app).get('/buildings/building-ekebergveien-14/residents');
    expect(res.body).toHaveLength(12);
  });
});

describe('GET /buildings/:buildingId/residents/full', () => {
  it('returnerer beboere med meta-data', async () => {
    const res = await request(app).get('/buildings/building-storgata-12/residents/full');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].meta).toBeDefined();
    expect(res.body[0].meta.source).toBe('fiber-system');
  });

  it('beboere har interessescorer', async () => {
    const res = await request(app).get('/buildings/building-storgata-12/residents/full');
    for (const r of res.body) {
      expect(r.interestScores).toBeDefined();
      expect(typeof r.interestScores.internett).toBe('number');
    }
  });
});

describe('GET /residents/:unitId', () => {
  it('returnerer full beboerprofil for en kjent enhet', async () => {
    const res = await request(app).get('/residents/building-storgata-12-h0101');
    expect(res.status).toBe(200);
    expect(res.body.unitId).toBe('building-storgata-12-h0101');
    expect(res.body.meta.source).toBe('fiber-system');
  });

  it('returnerer 404 for ukjent enhet', async () => {
    const res = await request(app).get('/residents/ukjent-enhet-xyz');
    expect(res.status).toBe(404);
  });
});

describe('GET /customers', () => {
  it('returnerer kunder for et bygg', async () => {
    const res = await request(app).get('/customers?buildingId=building-storgata-12');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('returnerer 400 uten buildingId', async () => {
    const res = await request(app).get('/customers');
    expect(res.status).toBe(400);
  });
});

describe('GET /search', () => {
  it('finner beboere på navn', async () => {
    const res = await request(app).get('/search?q=hansen');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const r of res.body) {
      expect(r.name.toLowerCase()).toContain('hansen');
    }
  });

  it('returnerer 400 for kort søk', async () => {
    const res = await request(app).get('/search?q=a');
    expect(res.status).toBe(400);
  });
});

describe('GET /pricing/campaigns', () => {
  it('returnerer alle kampanjer', async () => {
    const res = await request(app).get('/pricing/campaigns');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('kampanjer har source-metadata fra pricing-system', async () => {
    const res = await request(app).get('/pricing/campaigns');
    for (const c of res.body) {
      expect(c.meta.source).toBe('pricing-system');
    }
  });
});

describe('GET /pricing/campaigns/segment', () => {
  it('returnerer kampanjer for new-customer segment', async () => {
    const res = await request(app).get('/pricing/campaigns/segment?segment=new-customer');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const c of res.body) {
      expect(
        c.eligibleFor.includes('new-customer') || c.eligibleFor.includes('all')
      ).toBe(true);
    }
  });

  it('returnerer 400 for ugyldig segment', async () => {
    const res = await request(app).get('/pricing/campaigns/segment?segment=ukjent');
    expect(res.status).toBe(400);
  });
});

describe('GET /pricing/calculate/:productId', () => {
  it('returnerer pris for fiber-500', async () => {
    const res = await request(app).get('/pricing/calculate/fiber-500');
    expect(res.status).toBe(200);
    expect(res.body.productId).toBe('fiber-500');
    expect(typeof res.body.finalPrice).toBe('number');
  });

  it('returnerer 404 for ukjent produkt', async () => {
    const res = await request(app).get('/pricing/calculate/ukjent-xyz');
    expect(res.status).toBe(404);
  });
});
