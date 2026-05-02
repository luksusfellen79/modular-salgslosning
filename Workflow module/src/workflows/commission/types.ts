// ── Commission workflow domain types ──
export interface CommissionReport {
  id: string;
  period: string;       // "2025-04" (år-måned)
  generatedAt: string;  // ISO timestamp
  status: 'pending_approval' | 'approved' | 'rejected' | 'exported';
  agencies: AgencyCommission[];
  totals: {
    totalSales: number;
    totalRevenue: number;
    totalCommission: number;
  };
}

export interface AgencyCommission {
  agencyId: string;
  agencyName: string;
  contactEmail: string;
  salesCount: number;
  totalRevenue: number;
  totalCommission: number;
  salesReps: SalesRepCommission[];
}

export interface SalesRepCommission {
  salesRepId: string;
  salesRepName: string;
  salesCount: number;
  commission: number;
}

export interface POExport {
  exportedAt: string;
  period: string;
  lineItems: Array<{
    description: string; // "Provisjon - {agencyName} - {period}"
    agencyName: string;
    agencyId: string;
    amount: number;
    currency: 'NOK';
  }>;
  totalAmount: number;
  currency: 'NOK';
}
