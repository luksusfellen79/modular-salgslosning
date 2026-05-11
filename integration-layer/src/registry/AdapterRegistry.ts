// ── AdapterRegistry — orkestrerer alle adaptere ──
// Sentralt punkt for å hente data på tvers av kilde-systemer.
// Gateway og API-ruter kaller Registry — aldri adaptere direkte.

import {
  IProductAdapter,
  ICustomerAdapter,
  IPricingAdapter,
} from '../adapters/IAdapter.js';
import {
  Product,
  Resident,
  ResidentSummary,
  Customer,
  Campaign,
  PricedProduct,
  AvailabilityResult,
  AdapterHealth,
  CustomerSegment,
} from '../types/domain.js';
import { InMemoryCache } from '../cache/InMemoryCache.js';
import { logger } from '../logger.js';

export class AdapterRegistry {
  private productAdapters: IProductAdapter[] = [];
  private customerAdapter: ICustomerAdapter | null = null;
  private pricingAdapter: IPricingAdapter | null = null;
  private cache: InMemoryCache;

  constructor(cache: InMemoryCache) {
    this.cache = cache;
  }

  // ─── Registrering ────────────────────────────────────────────────────────

  registerProductAdapter(adapter: IProductAdapter): void {
    this.productAdapters.push(adapter);
    logger.info('Product adapter registered', { name: adapter.name, source: adapter.sourceId });
  }

  registerCustomerAdapter(adapter: ICustomerAdapter): void {
    this.customerAdapter = adapter;
    logger.info('Customer adapter registered', { name: adapter.name, source: adapter.sourceId });
  }

  registerPricingAdapter(adapter: IPricingAdapter): void {
    this.pricingAdapter = adapter;
    logger.info('Pricing adapter registered', { name: adapter.name, source: adapter.sourceId });
  }

  // ─── Produkter — aggregerer fra alle produkt-adaptere ───────────────────

  async getAllProducts(): Promise<Product[]> {
    const cacheKey = 'products:all';
    const cached = this.cache.get<Product[]>(cacheKey);
    if (cached) return cached.map(p => ({ ...p, meta: { ...p.meta, cached: true } }));

    const results = await Promise.all(
      this.productAdapters.map(a => a.getProducts().catch(err => {
        logger.error('Product adapter failed', { adapter: a.name, error: err });
        return [] as Product[];
      }))
    );

    const products = results.flat();
    this.cache.set(cacheKey, products, 300);
    return products;
  }

  async getProductById(productId: string): Promise<Product | null> {
    for (const adapter of this.productAdapters) {
      const product = await adapter.getProductById(productId).catch(() => null);
      if (product) return product;
    }
    return null;
  }

  async getAvailableProducts(buildingId?: string, unitId?: string): Promise<AvailabilityResult> {
    const cacheKey = `availability:${buildingId ?? 'all'}:${unitId ?? 'all'}`;
    const cached = this.cache.get<AvailabilityResult>(cacheKey);
    if (cached) return cached;

    const [allProducts, campaigns] = await Promise.all([
      this.getAllProducts(),
      this.pricingAdapter?.getCampaigns() ?? Promise.resolve([]),
    ]);

    // Koble kampanjer til produkter
    const priced: PricedProduct[] = allProducts.map(product => {
      const campaign = campaigns.find(c => c.productId === product.productId);
      return {
        ...product,
        finalPrice: campaign ? campaign.campaignPrice : product.basePrice,
        campaign,
      };
    });

    const result: AvailabilityResult = {
      buildingId,
      unitId,
      products: priced,
      checkedAt: new Date().toISOString(),
    };

    this.cache.set(cacheKey, result, 120);
    return result;
  }

  // ─── Kunder og beboere ───────────────────────────────────────────────────

  async getResidents(buildingId: string): Promise<Resident[]> {
    if (!this.customerAdapter) return [];
    const cacheKey = `residents:full:${buildingId}`;
    const cached = this.cache.get<Resident[]>(cacheKey);
    if (cached) return cached;

    const residents = await this.customerAdapter.getResidents(buildingId);
    this.cache.set(cacheKey, residents, 60);
    return residents;
  }

  async getResidentSummaries(buildingId: string): Promise<ResidentSummary[]> {
    if (!this.customerAdapter) return [];
    const cacheKey = `residents:summary:${buildingId}`;
    const cached = this.cache.get<ResidentSummary[]>(cacheKey);
    if (cached) return cached;

    const summaries = await this.customerAdapter.getResidentSummaries(buildingId);
    this.cache.set(cacheKey, summaries, 60);
    return summaries;
  }

  async getResidentByUnit(unitId: string): Promise<Resident | null> {
    if (!this.customerAdapter) return null;
    const cacheKey = `resident:${unitId}`;
    const cached = this.cache.get<Resident>(cacheKey);
    if (cached) return cached;

    const resident = await this.customerAdapter.getResidentByUnit(unitId);
    if (resident) this.cache.set(cacheKey, resident, 60);
    return resident;
  }

  async getCustomer(customerId: string): Promise<Customer | null> {
    if (!this.customerAdapter) return null;
    const cacheKey = `customer:${customerId}`;
    const cached = this.cache.get<Customer>(cacheKey);
    if (cached) return cached;

    const customer = await this.customerAdapter.getCustomer(customerId);
    if (customer) this.cache.set(cacheKey, customer, 60);
    return customer;
  }

  async getCustomersByBuilding(buildingId: string): Promise<Customer[]> {
    if (!this.customerAdapter) return [];
    return this.customerAdapter.getCustomersByBuilding(buildingId);
  }

  async searchResidents(query: string): Promise<Resident[]> {
    if (!this.customerAdapter) return [];
    return this.customerAdapter.searchResidents(query);
  }

  // ─── Prising og kampanjer ────────────────────────────────────────────────

  async getCampaigns(): Promise<Campaign[]> {
    if (!this.pricingAdapter) return [];
    const cacheKey = 'campaigns:all';
    const cached = this.cache.get<Campaign[]>(cacheKey);
    if (cached) return cached;

    const campaigns = await this.pricingAdapter.getCampaigns();
    this.cache.set(cacheKey, campaigns, 120);
    return campaigns;
  }

  async getCampaignsForSegment(segment: CustomerSegment): Promise<Campaign[]> {
    if (!this.pricingAdapter) return [];
    return this.pricingAdapter.getCampaignsForSegment(segment);
  }

  async calculatePrice(productId: string, customerId?: string): Promise<PricedProduct | null> {
    if (!this.pricingAdapter) return null;
    return this.pricingAdapter.calculatePrice(productId, customerId);
  }

  // ─── Helse ───────────────────────────────────────────────────────────────

  async getAdapterHealth(): Promise<AdapterHealth[]> {
    const checks: Promise<AdapterHealth>[] = [];

    for (const adapter of this.productAdapters) {
      checks.push(
        adapter.isHealthy()
          .then(healthy => ({
            adapterId: adapter.sourceId,
            name: adapter.name,
            source: adapter.sourceId,
            healthy,
            checkedAt: new Date().toISOString(),
          }))
          .catch(() => ({
            adapterId: adapter.sourceId,
            name: adapter.name,
            source: adapter.sourceId,
            healthy: false,
            checkedAt: new Date().toISOString(),
          }))
      );
    }

    if (this.customerAdapter) {
      const a = this.customerAdapter;
      checks.push(
        a.isHealthy()
          .then(healthy => ({ adapterId: a.sourceId, name: a.name, source: a.sourceId, healthy, checkedAt: new Date().toISOString() }))
          .catch(() => ({ adapterId: a.sourceId, name: a.name, source: a.sourceId, healthy: false, checkedAt: new Date().toISOString() }))
      );
    }

    if (this.pricingAdapter) {
      const a = this.pricingAdapter;
      checks.push(
        a.isHealthy()
          .then(healthy => ({ adapterId: a.sourceId, name: a.name, source: a.sourceId, healthy, checkedAt: new Date().toISOString() }))
          .catch(() => ({ adapterId: a.sourceId, name: a.name, source: a.sourceId, healthy: false, checkedAt: new Date().toISOString() }))
      );
    }

    return Promise.all(checks);
  }

  getCacheSize(): number {
    return this.cache.size();
  }
}
