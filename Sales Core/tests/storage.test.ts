// ── Storage unit tests ──
import fs from 'fs';
import os from 'os';
import path from 'path';
import { jest } from '@jest/globals';
import { readEvents, readOffers, readOpportunities, writeEvents, writeOffers, writeOpportunities } from '../src/storage';
import { Offer, OfferEvent, Opportunity } from '../src/types';

describe('storage', () => {
  let tempRoot: string;
  let cwdSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sales-core-test-'));
    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempRoot);
    delete process.env.DATA_DIR;
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('readOpportunities returns an array', () => {
    const opportunities = readOpportunities();
    expect(Array.isArray(opportunities)).toBe(true);
  });

  test('roundtrip write and read for opportunities, offers, and events', () => {
    const opportunity: Opportunity = {
      id: 'opp-test',
      name: 'Test',
      accountName: 'Test AS',
      contactName: 'Test Person',
      contactEmail: 'test@example.com',
      stage: 'prospect',
      closeDate: '2026-12-31',
      estimatedAnnualValue: 1000,
      units: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const offer: Offer = {
      id: 'offer-test',
      opportunityId: opportunity.id,
      accountName: 'Test AS',
      contactName: 'Test Person',
      contactEmail: 'test@example.com',
      packageId: 'pkg-test',
      packageName: 'Testpakke',
      selectedProducts: ['prod-1'],
      monthlyPricePerUnit: 100,
      discountPercent: 0,
      units: 1,
      salesRepName: 'Rep',
      trackingToken: 'token-test',
      status: 'draft',
      validUntil: '2026-12-31',
      viewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const event: OfferEvent = {
      id: 'event-test',
      offerId: offer.id,
      opportunityId: opportunity.id,
      accountName: 'Test AS',
      contactName: 'Test Person',
      type: 'created',
      timestamp: new Date().toISOString(),
    };

    writeOpportunities([opportunity]);
    writeOffers([offer]);
    writeEvents([event]);

    expect(readOpportunities()).toEqual([{ ...opportunity, salesRepName: 'Jørn Haga' }]);
    expect(readOffers()).toEqual([offer]);
    expect(readEvents()).toEqual([event]);
  });
});
