/**
 * KAS Core API client
 *
 * Wrapper rundt KAS Core REST API — produktkatalog for MDU og SDU.
 * Faller tilbake til localhost:3001 i dev.
 */

const BASE_URL = (import.meta.env.VITE_KAS_CORE_URL as string | undefined) ?? 'http://localhost:3001';

// ─── MDU Types (mirrors KAS Core types) ──────────────────────────────────────

export type MDUComponentCategory = 'internett' | 'tv' | 'strømming' | 'sikkerhet' | 'utstyr';

export interface KASIncentive {
  id: string;
  name: string;
  description: string;
  type: 'discount_percent' | 'discount_months' | 'bonus_per_sale' | 'free_period';
  value: number;
  currency?: 'NOK' | 'percent' | 'months';
  validFrom: string;
  validUntil: string;
  visibleToSeller: boolean;
}

export interface KASMDUComponent {
  componentId: string;
  name: string;
  category: MDUComponentCategory;
  description: string;
  points: number;
  costPerUnit: number;
  specs?: Record<string, string>;
  isDefault: boolean;
}

export interface KASMDUPackage {
  packageId: string;
  name: string;
  tier: 'S' | 'M' | 'L' | 'XL';
  description: string;
  monthlyPricePerUnit: number;
  costPerUnit: number;
  commissionRate: number;
  totalPoints: number;
  defaultComponents: string[];
  availableComponents: string[];
  color: string;
  featured?: boolean;
  incentives: KASIncentive[];
  isActive: boolean;
}

// ─── Category mapping ─────────────────────────────────────────────────────────

/** Maps KAS Core MDU category names to OfferHub category names */
export const categoryMap: Record<MDUComponentCategory, string> = {
  internett:  'broadband',
  tv:         'tv',
  strømming:  'streaming',
  sikkerhet:  'security',
  utstyr:     'hardware',
};

// ─── Fetch functions ──────────────────────────────────────────────────────────

export async function fetchMDUPackages(): Promise<KASMDUPackage[]> {
  const res = await fetch(`${BASE_URL}/products/mdu`);
  if (!res.ok) throw new Error(`KAS Core /products/mdu: ${res.status}`);
  return res.json();
}

export async function fetchMDUComponents(): Promise<KASMDUComponent[]> {
  const res = await fetch(`${BASE_URL}/products/mdu/components`);
  if (!res.ok) throw new Error(`KAS Core /products/mdu/components: ${res.status}`);
  return res.json();
}
