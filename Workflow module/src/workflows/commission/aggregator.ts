// ── Aggregates confirmed sales per agency for commission calculation ──
import { Sale, Agency } from '../../gateway/types';
import { AgencyCommission, SalesRepCommission } from './types';

export function aggregateSalesByAgency(sales: Sale[], agencies: Agency[]): AgencyCommission[] {
  const agencyMap = new Map<string, Agency>(agencies.map((a) => [a.id, a]));

  const grouped = new Map<string, Sale[]>();
  for (const sale of sales) {
    if (sale.status !== 'confirmed') continue;
    const existing = grouped.get(sale.agencyId) ?? [];
    existing.push(sale);
    grouped.set(sale.agencyId, existing);
  }

  const result: AgencyCommission[] = [];

  for (const [agencyId, agencySales] of grouped) {
    const agency = agencyMap.get(agencyId);

    const salesRepMap = new Map<string, Sale[]>();
    for (const sale of agencySales) {
      const existing = salesRepMap.get(sale.salesRepId) ?? [];
      existing.push(sale);
      salesRepMap.set(sale.salesRepId, existing);
    }

    const salesReps: SalesRepCommission[] = [];
    for (const [salesRepId, repSales] of salesRepMap) {
      const commission = repSales.reduce((sum, s) => sum + s.amount * s.commissionRate, 0);
      salesReps.push({
        salesRepId,
        salesRepName: repSales[0]?.salesRepName ?? salesRepId,
        salesCount: repSales.length,
        commission: Math.round(commission * 100) / 100,
      });
    }

    const totalRevenue = agencySales.reduce((sum, s) => sum + s.amount, 0);
    const totalCommission = agencySales.reduce((sum, s) => sum + s.amount * s.commissionRate, 0);

    result.push({
      agencyId,
      agencyName: agency?.name ?? agencyId,
      contactEmail: agency?.contactEmail ?? '',
      salesCount: agencySales.length,
      totalRevenue,
      totalCommission: Math.round(totalCommission * 100) / 100,
      salesReps,
    });
  }

  return result;
}
