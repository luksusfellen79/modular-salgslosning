// ── Adapter-grensesnitt — kontrakt alle adaptere må oppfylle ──
// Ekte adaptere (fiber-system, mobil-system etc.) implementerer disse.
// Mock-adaptere bruker samme grensesnitt — bytting skjer i AdapterRegistry.

import {
  DataSource,
  Product,
  Campaign,
  PricedProduct,
  Resident,
  ResidentSummary,
  Customer,
  CustomerSegment,
} from '../types/domain.js';

// ─── Felles base ───────────────────────────────────────────────────────────

export interface IBaseAdapter {
  readonly sourceId: DataSource;
  readonly name: string;
  isHealthy(): Promise<boolean>;
}

// ─── Produktadapter — Fiber, Mobil, TV ────────────────────────────────────

export interface IProductAdapter extends IBaseAdapter {
  getProducts(): Promise<Product[]>;
  getProductById(productId: string): Promise<Product | null>;
}

// ─── Kundeadapter — KAS Core / Fiber-system ───────────────────────────────

export interface ICustomerAdapter extends IBaseAdapter {
  getResidents(buildingId: string): Promise<Resident[]>;
  getResidentSummaries(buildingId: string): Promise<ResidentSummary[]>;
  getResidentByUnit(unitId: string): Promise<Resident | null>;
  getCustomer(customerId: string): Promise<Customer | null>;
  getCustomersByBuilding(buildingId: string): Promise<Customer[]>;
  searchResidents(query: string): Promise<Resident[]>;
}

// ─── Prisadapter — Pris-system ────────────────────────────────────────────

export interface IPricingAdapter extends IBaseAdapter {
  getCampaigns(): Promise<Campaign[]>;
  getCampaignsForSegment(segment: CustomerSegment): Promise<Campaign[]>;
  calculatePrice(productId: string, customerId?: string): Promise<PricedProduct | null>;
}
