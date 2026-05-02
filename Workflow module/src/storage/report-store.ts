// ── File-based report persistence — reads/writes JSON under ./data/reports ──
import fs from 'fs';
import path from 'path';
import { CommissionReport } from '../workflows/commission/types';
import logger from '../logger';

export interface ReportIndex {
  [reportId: string]: {
    period: string;
    status: CommissionReport['status'];
    generatedAt: string;
  };
}

function getDataDir(): string {
  return process.env.REPORTS_DIR ?? path.join(process.cwd(), 'data', 'reports');
}

function getIndexPath(): string {
  return path.join(getDataDir(), 'index.json');
}

function ensureDir(): void {
  fs.mkdirSync(getDataDir(), { recursive: true });
}

function readIndex(): ReportIndex {
  ensureDir();
  const indexPath = getIndexPath();
  if (!fs.existsSync(indexPath)) return {};
  return JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as ReportIndex;
}

function writeIndex(index: ReportIndex): void {
  fs.writeFileSync(getIndexPath(), JSON.stringify(index, null, 2));
}

export function saveReport(report: CommissionReport): void {
  ensureDir();
  const reportPath = path.join(getDataDir(), `${report.period}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const index = readIndex();
  index[report.id] = { period: report.period, status: report.status, generatedAt: report.generatedAt };
  writeIndex(index);

  logger.info('report_saved', { reportId: report.id, period: report.period, path: reportPath });
}

export function loadReport(reportId: string): CommissionReport | null {
  const index = readIndex();
  const entry = index[reportId];
  if (!entry) return null;

  const reportPath = path.join(getDataDir(), `${entry.period}.json`);
  if (!fs.existsSync(reportPath)) return null;

  return JSON.parse(fs.readFileSync(reportPath, 'utf-8')) as CommissionReport;
}

export function updateReportStatus(
  reportId: string,
  status: CommissionReport['status']
): CommissionReport | null {
  const report = loadReport(reportId);
  if (!report) return null;

  report.status = status;
  saveReport(report);
  return report;
}

export function listReports(): ReportIndex {
  return readIndex();
}
