// ── Seed data tests ──
import { customers, residents } from '../src/seed';

describe('Seed data consistency', () => {
  it('includes all three building IDs', () => {
    const buildingIds = Array.from(new Set(residents.map((resident) => resident.buildingId)));
    expect(buildingIds).toEqual(expect.arrayContaining([
      'building-storgata-12',
      'building-kirkeveien-45',
      'building-ekebergveien-14',
    ]));
  });

  it('creates exactly 54 residents', () => {
    expect(residents).toHaveLength(54);
  });

  it('creates between 15 and 25 existing customers', () => {
    expect(customers.length).toBeGreaterThanOrEqual(15);
    expect(customers.length).toBeLessThanOrEqual(25);
  });

  it('ensures every existing customer has at least one active product', () => {
    const existingResidents = residents.filter((resident) => resident.isExistingCustomer);
    for (const resident of existingResidents) {
      expect(resident.existingProducts.length).toBeGreaterThanOrEqual(1);
      expect(resident.customerId).toBeDefined();
    }
  });

  it('ensures every resident has between 2 and 3 unique campaigns', () => {
    for (const resident of residents) {
      expect(resident.campaigns.length).toBeGreaterThanOrEqual(2);
      expect(resident.campaigns.length).toBeLessThanOrEqual(3);
      const names = resident.campaigns.map((campaign) => campaign.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('ensures approximately 20% are previous customers with churn data', () => {
    const previousCustomers = residents.filter(
      (resident) => !resident.isExistingCustomer && resident.previousProducts.length > 0,
    );
    expect(previousCustomers.length).toBeGreaterThanOrEqual(9);
    expect(previousCustomers.length).toBeLessThanOrEqual(13);
    for (const resident of previousCustomers) {
      expect(resident.cancelReason).toBeDefined();
    }
  });

  it('ensures never-customers have internett interest over 60', () => {
    const neverCustomers = residents.filter(
      (resident) => !resident.isExistingCustomer && resident.previousProducts.length === 0,
    );
    for (const resident of neverCustomers) {
      expect(resident.interestScores.internett).toBeGreaterThan(60);
    }
  });
});
