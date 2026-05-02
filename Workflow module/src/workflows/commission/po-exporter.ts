// ── Generates PO export JSON file for approved commission reports ──
import fs from 'fs';
import path from 'path';
import { CommissionReport, POExport } from './types';
import logger from '../../logger';

function getExportsDir(): string {
  return process.env.EXPORTS_DIR ?? path.join(process.cwd(), 'data', 'exports');
}

export function generatePOExport(report: CommissionReport, correlationId: string): POExport {
  const exportsDir = getExportsDir();
  fs.mkdirSync(exportsDir, { recursive: true });

  const poExport: POExport = {
    exportedAt: new Date().toISOString(),
    period: report.period,
    lineItems: report.agencies.map((agency) => ({
      description: `Provisjon - ${agency.agencyName} - ${report.period}`,
      agencyName: agency.agencyName,
      agencyId: agency.agencyId,
      amount: agency.totalCommission,
      currency: 'NOK',
    })),
    totalAmount: report.totals.totalCommission,
    currency: 'NOK',
  };

  const exportPath = path.join(exportsDir, `${report.id}_PO.json`);
  fs.writeFileSync(exportPath, JSON.stringify(poExport, null, 2));

  logger.info('po_export_generated', { correlationId, reportId: report.id, exportPath, totalAmount: poExport.totalAmount });

  return poExport;
}
