// ── Unified domain model — alle data som passerer gjennom Integration Layer ──
// Alle entiteter har SourceMeta som forteller hvor dataen kom fra og når.

// ─── Kilde-system identifikasjon ───────────────────────────────────────────

export type DataSource =
  | 'fiber-system'
  | 'mobile-system'
  | 'tv-system'
  | 'pricing-system'
  | 'customer-system'
  | 'kafka'
  | 'mock'
  | 'sdu-crm'
  | 'sales-core'
  | 'mdu-crm'
  | 'workflow-module'
  | 'incentive-manager'
  | 'case-service'
  | 'email-adapter';

export type ProductCategory = 'fiber' | 'mobile' | 'tv' | 'security' | 'bundle';

export interface SourceMeta {
  source: DataSource;
  fetchedAt: string;  // ISO timestamp
  cached: boolean;
}

// ─── Produktkatalog ────────────────────────────────────────────────────────

export interface Product {
  productId: string;
  name: string;
  category: ProductCategory;
  description: string;
  basePrice: number;           // månedspris NOK
  unit: 'monthly' | 'one-time';
  requiresFiber?: boolean;     // krever eksisterende fiber-linje
  meta: SourceMeta;
}

// ─── Kampanjer og prising ──────────────────────────────────────────────────

export type CustomerSegment = 'new-customer' | 'win-back' | 'existing-customer' | 'all';

export interface Campaign {
  campaignId: string;
  name: string;
  tag: string;                 // "Kampanje", "Win-back", "Upsell" etc.
  productId: string;
  productName: string;
  campaignPrice: number;       // månedspris med rabatt
  basePrice: number;           // ordinær pris
  discountPercent: number;
  pitch: string;               // salgspitch
  color: string;               // hex-farge for UI
  validFrom: string;           // ISO date
  validTo?: string;            // ISO date — undefined = løpende
  eligibleFor: CustomerSegment[];
  meta: SourceMeta;
}

export interface PricedProduct extends Product {
  campaign?: Campaign;
  finalPrice: number;          // kampanjepris hvis aktiv, ellers basePrice
}

// ─── Tilgjengelighet ───────────────────────────────────────────────────────

export interface AvailabilityResult {
  buildingId?: string;
  unitId?: string;
  products: PricedProduct[];
  checkedAt: string;           // ISO timestamp
}

// ─── Kunder og beboere ────────────────────────────────────────────────────

export interface CustomerProduct {
  productId: string;
  name: string;
  monthlyCost: number;
  activeSince: string;         // ISO date
}

export interface InterestScores {
  sikre: number;               // 0–100
  mobil: number;               // 0–100
  internett: number;           // 0–100
  produktX: number;            // 0–100
}

export interface Resident {
  unitId: string;
  buildingId: string;
  unitNumber: string;
  floor: number;
  name: string;
  phone?: string;
  isExistingCustomer: boolean;
  customerId?: string;
  existingProducts: string[];
  previousProducts: string[];
  cancelReason?: string;
  customerSince?: string;      // ISO date
  interestScores: InterestScores;
  campaigns: Campaign[];
  meta: SourceMeta;
}

export interface ResidentSummary {
  unitId: string;
  name: string;
  isExistingCustomer: boolean;
  existingProducts: string[];
}

export interface Customer {
  customerId: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  postalCode: string;
  city: string;
  unitId: string;
  buildingId: string;
  existingProducts: CustomerProduct[];
  previousProducts: CustomerProduct[];
  cancelReason?: string;
  customerSince: string;       // ISO date
  accountValue: number;        // månedlig verdi NOK
  interestScores: InterestScores;
  campaigns: Campaign[];
  meta: SourceMeta;
}

// ─── Salgskontekst (churn, win-back, oppgraderingspotensial) ──────────────

export type ChurnRisk = 'lav' | 'middels' | 'høy';

export interface SalesContext {
  personId: string;
  churnRisk: ChurnRisk;
  churnRiskScore: number;      // 0–100
  erWinBackKandidat: boolean;
  tidligereAvgang?: string;    // ISO date — når sluttet de
  tidligereProdukt?: string;   // produktnavn
  avgangsÅrsak?: string;
  oppgraderingsPotensial: number; // 0–100
  anbefaltProdukt?: string;
  livstidsverdi: number;       // estimert LTV i NOK
  meta: SourceMeta;
}

// ─── Event-system ──────────────────────────────────────────────────────────

export interface IntegrationEvent {
  eventId: string;
  eventType: string;
  source: DataSource;
  occurredAt: string;          // ISO timestamp
  payload: Record<string, unknown>;
}

// ─── Helse ─────────────────────────────────────────────────────────────────

export interface AdapterHealth {
  adapterId: string;
  name: string;
  source: DataSource;
  healthy: boolean;
  checkedAt: string;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  adapters: AdapterHealth[];
  cachedEntries: number;
  uptime: number;              // sekunder
}
