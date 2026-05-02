// ── Gateway data types shared across the module ──
export interface Sale {
  id: string;
  agencyId: string;
  agencyName: string;
  salesRepId: string;
  salesRepName: string;
  productId: string;
  productName: string;
  amount: number;
  commissionRate: number; // prosent, f.eks. 0.08 = 8%
  saleDate: string;       // ISO 8601
  status: 'confirmed' | 'pending' | 'cancelled';
}

export interface Agency {
  id: string;
  name: string;
  contactEmail: string;
  managerId: string;
}
