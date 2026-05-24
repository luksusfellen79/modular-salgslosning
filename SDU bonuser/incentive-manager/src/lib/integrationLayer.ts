const BASE =
  (import.meta.env.VITE_INTEGRATION_LAYER_URL as string | undefined)
  ?? 'https://integration-layer-production.up.railway.app';

export type ProductCategory = 'internett' | 'tv' | 'mobil' | 'sikkerhet' | 'strømming' | 'utstyr';

export type IncentiveType = 'discount_percent' | 'discount_months' | 'bonus_per_sale' | 'free_period';

export interface Incentive {
  id: string;
  name: string;
  description: string;
  type: IncentiveType;
  value: number;
  currency?: 'NOK' | 'percent' | 'months';
  validFrom: string;
  validUntil: string;
  visibleToSeller: boolean;
}

export interface SDUProduct {
  productId: string;
  name: string;
  category: ProductCategory;
  description: string;
  monthlyPrice: number;
  costPrice: number;
  commissionRate: number;
  specs?: Record<string, string>;
  incentives: Incentive[];
  isActive: boolean;
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  internett: 'Internett',
  tv: 'TV',
  mobil: 'Mobil',
  sikkerhet: 'Sikkerhet',
  strømming: 'Strømming',
  utstyr: 'Utstyr',
};

export const CATEGORY_ICONS: Record<ProductCategory, string> = {
  internett: '📡',
  tv: '📺',
  mobil: '📱',
  sikkerhet: '🔒',
  strømming: '▶️',
  utstyr: '🖥️',
};

export async function fetchSDUProducts(): Promise<SDUProduct[]> {
  const res = await fetch(`${BASE}/products/sdu?activeOnly=true`);
  if (!res.ok) throw new Error(`Integration Layer: ${res.status}`);
  return res.json() as Promise<SDUProduct[]>;
}

export async function addProductIncentive(
  productId: string,
  incentive: Omit<Incentive, 'id'>,
): Promise<SDUProduct> {
  const res = await fetch(`${BASE}/products/sdu/${productId}/incentives`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(incentive),
  });
  if (!res.ok) throw new Error(`Integration Layer POST incentive: ${res.status}`);
  return res.json() as Promise<SDUProduct>;
}

export async function removeProductIncentive(
  productId: string,
  incentiveId: string,
): Promise<SDUProduct> {
  const res = await fetch(`${BASE}/products/sdu/${productId}/incentives/${incentiveId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Integration Layer DELETE incentive: ${res.status}`);
  return res.json() as Promise<SDUProduct>;
}

export interface CalculatedBonus {
  id: string;
  occurredAt: string;
  sellerName?: string;
  unitId: string;
  buildingId: string;
  roundId?: string;
  totalBonusKr: number;
  periodMonth: string;
  lineItems: Array<{
    productId: string;
    productName: string;
    incentiveName: string;
    bonusKr: number;
  }>;
}

export async function fetchRecentBonuses(limit = 20): Promise<CalculatedBonus[]> {
  const res = await fetch(`${BASE}/bonuses?limit=${limit}`);
  if (!res.ok) throw new Error(`Integration Layer bonuses: ${res.status}`);
  const data = await res.json() as { bonuses: CalculatedBonus[] };
  return data.bonuses;
}
