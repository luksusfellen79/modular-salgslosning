// ── SDU produktkatalog — typer for feltsalg og insentivstyring ──

export type ProductCategory =
  | 'internett'
  | 'tv'
  | 'mobil'
  | 'sikkerhet'
  | 'strømming'
  | 'utstyr';

export type IncentiveType =
  | 'discount_percent'
  | 'discount_months'
  | 'bonus_per_sale'
  | 'free_period';

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
