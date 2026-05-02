// ── Builds CommissionReport from aggregated agency sales data ──
import { v4 as uuidv4 } from 'uuid';
import { GatewayClient } from '../../gateway/gateway-client';
import { aggregateSalesByAgency } from './aggregator';
import { CommissionReport } from './types';
import logger from '../../logger';

export function getPreviousMonthPeriod(): string {
  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function getPeriodDateRange(period: string): { fromDate: string; toDate: string } {
  const parts = period.split('-');
  const year = parseInt(parts[0] ?? '0', 10);
  const month = parseInt(parts[1] ?? '0', 10);
  const fromDate = `${period}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const toDate = `${period}-${String(lastDay).padStart(2, '0')}`;
  return { fromDate, toDate };
}

export async function generateCommissionReport(
  gatewayClient: GatewayClient,
  correlationId: string,
  period?: string
): Promise<CommissionReport> {
  const reportPeriod = period ?? getPreviousMonthPeriod();
  const { fromDate, toDate } = getPeriodDateRange(reportPeriod);

  logger.info('commission_report_generating', { correlationId, period: reportPeriod, fromDate, toDate });

  const [sales, agencies] = await Promise.all([
    gatewayClient.getSalesForPeriod(fromDate, toDate, correlationId),
    gatewayClient.getAgencies(correlationId),
  ]);

  const agencyCommissions = aggregateSalesByAgency(sales, agencies);

  const totals = agencyCommissions.reduce(
    (acc, a) => ({
      totalSales: acc.totalSales + a.salesCount,
      totalRevenue: acc.totalRevenue + a.totalRevenue,
      totalCommission: acc.totalCommission + a.totalCommission,
    }),
    { totalSales: 0, totalRevenue: 0, totalCommission: 0 }
  );

  const report: CommissionReport = {
    id: uuidv4(),
    period: reportPeriod,
    generatedAt: new Date().toISOString(),
    status: 'pending_approval',
    agencies: agencyCommissions,
    totals: {
      ...totals,
      totalCommission: Math.round(totals.totalCommission * 100) / 100,
    },
  };

  logger.info('commission_report_generated', {
    correlationId,
    reportId: report.id,
    period: report.period,
    totalCommission: report.totals.totalCommission,
  });

  return report;
}
