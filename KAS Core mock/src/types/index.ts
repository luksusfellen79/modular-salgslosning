// ── API type definitions ──

// ─── Resident / Customer ──────────────────────────────────────────────────────

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
  customerSince?: string;
  interestScores: InterestScores;
  campaigns: Campaign[];
  upsellProducts: string[];
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
  customerSince: string;
  accountValue: number;
  interestScores: InterestScores;
  campaigns: Campaign[];
  upsellProducts: string[];
}

export interface CustomerProduct {
  productId: string;
  name: string;
  monthlyCost: number;
  activeSince: string;
}

export interface InterestScores {
  sikre: number;
  mobil: number;
  internett: number;
  produktX: number;
}

export interface Campaign {
  id: string;
  name: string;
  tag: string;
  product: string;
  price: string;
  discount: string;
  pitch: string;
  color: string;
}

export interface ResidentSummary {
  unitId: string;
  name: string;
  isExistingCustomer: boolean;
  existingProducts: string[];
}

// ─── Product catalog ──────────────────────────────────────────────────────────

export type ProductCategory =
  | 'internett'
  | 'tv'
  | 'mobil'
  | 'sikkerhet'
  | 'strømming'
  | 'utstyr';

export type MDUComponentCategory =
  | 'internett'
  | 'tv'
  | 'strømming'
  | 'sikkerhet'
  | 'utstyr';

/** Aktiv kampanje/insentiv koblet til et produkt */
export interface Incentive {
  id: string;
  name: string;
  description: string;
  /** Typen insentiv */
  type: 'discount_percent' | 'discount_months' | 'bonus_per_sale' | 'free_period';
  /** Verdi: prosent, antall måneder, kr per salg */
  value: number;
  currency?: 'NOK' | 'percent' | 'months';
  validFrom: string;   // ISO-dato
  validUntil: string;  // ISO-dato
  /** Om innsentivet er synlig for selger i CRM */
  visibleToSeller: boolean;
}

// ─── SDU (Single Dwelling Unit) ───────────────────────────────────────────────

/** Individuelt forbrukerprodukt — selges per husstand */
export interface SDUProduct {
  productId: string;
  name: string;
  category: ProductCategory;
  description: string;
  /** Listepris per måned */
  monthlyPrice: number;
  /** Internkostnad per måned (for marginberegning) */
  costPrice: number;
  /** Provisjonssats i prosent ved salg */
  commissionRate: number;
  /** Tekniske egenskaper (for internett: hastighet, for mobil: data) */
  specs?: Record<string, string>;
  /** Aktive kampanjer/insentiver koblet til produktet */
  incentives: Incentive[];
  isActive: boolean;
}

// ─── MDU (Multi Dwelling Unit / Borettslag) ───────────────────────────────────

/** Komponent i en MDU-pakke — tilsvarer et enkelt tillegg/produkt */
export interface MDUComponent {
  componentId: string;
  name: string;
  category: MDUComponentCategory;
  description: string;
  /** Poengkostnad innenfor pakken (0 = inkludert) */
  points: number;
  /** Internkostnad per enhet per måned */
  costPerUnit: number;
  specs?: Record<string, string>;
  isDefault: boolean;
}

/** MDU-pakke — selges per borettslag, prises per enhet */
export interface MDUPackage {
  packageId: string;
  name: string;
  tier: 'S' | 'M' | 'L' | 'XL';
  description: string;
  /** Listepris per enhet per måned */
  monthlyPricePerUnit: number;
  /** Internkostnad per enhet per måned */
  costPerUnit: number;
  /** Provisjonssats i prosent */
  commissionRate: number;
  /** Totalt antall poeng tilgjengelig i pakken */
  totalPoints: number;
  /** Komponent-IDer som er inkludert som standard */
  defaultComponents: string[];
  /** Alle tilgjengelige komponenter (kan velges med poeng) */
  availableComponents: string[];
  color: string;
  featured?: boolean;
  /** Aktive kampanjer/insentiver koblet til pakken */
  incentives: Incentive[];
  isActive: boolean;
}

export interface ProductCatalog {
  sdu: {
    products: SDUProduct[];
    updatedAt: string;
  };
  mdu: {
    packages: MDUPackage[];
    components: MDUComponent[];
    updatedAt: string;
  };
}
