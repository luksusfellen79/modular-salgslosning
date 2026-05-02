// ── Tests for commission aggregation, report lifecycle, and PO export ──
import os from 'os';
import path from 'path';
import fs from 'fs';
import { aggregateSalesByAgency } from '../src/workflows/commission/aggregator';
import { generateCommissionReport } from '../src/workflows/commission/report-generator';
import { generatePOExport } from '../src/workflows/commission/po-exporter';
import { saveReport, updateReportStatus } from '../src/storage/report-store';
import { Sale, Agency } from '../src/gateway/types';
import { GatewayClient } from '../src/gateway/gateway-client';

jest.mock('../src/queue/approval-queue', () => ({
  enqueueForApproval: jest.fn().mockResolvedValue(undefined),
  getApprovalQueue: jest.fn(),
}));

const MOCK_AGENCIES: Agency[] = [
  { id: 'agency-1', name: 'Byrå Nord', contactEmail: 'nord@example.com', managerId: 'mgr-1' },
  { id: 'agency-2', name: 'Byrå Sør', contactEmail: 'sor@example.com', managerId: 'mgr-2' },
];

const MOCK_SALES: Sale[] = [
  { id: 's-01', agencyId: 'agency-1', agencyName: 'Byrå Nord', salesRepId: 'rep-1', salesRepName: 'Ola', productId: 'p-1', productName: 'Fiber', amount: 10000, commissionRate: 0.1, saleDate: '2026-04-01', status: 'confirmed' },
  { id: 's-02', agencyId: 'agency-1', agencyName: 'Byrå Nord', salesRepId: 'rep-1', salesRepName: 'Ola', productId: 'p-1', productName: 'Fiber', amount: 5000, commissionRate: 0.1, saleDate: '2026-04-02', status: 'confirmed' },
  { id: 's-03', agencyId: 'agency-1', agencyName: 'Byrå Nord', salesRepId: 'rep-2', salesRepName: 'Kari', productId: 'p-2', productName: 'Mobil', amount: 3000, commissionRate: 0.08, saleDate: '2026-04-03', status: 'confirmed' },
  { id: 's-04', agencyId: 'agency-2', agencyName: 'Byrå Sør', salesRepId: 'rep-3', salesRepName: 'Per', productId: 'p-1', productName: 'Fiber', amount: 8000, commissionRate: 0.1, saleDate: '2026-04-04', status: 'confirmed' },
  { id: 's-05', agencyId: 'agency-2', agencyName: 'Byrå Sør', salesRepId: 'rep-3', salesRepName: 'Per', productId: 'p-2', productName: 'Mobil', amount: 4000, commissionRate: 0.08, saleDate: '2026-04-05', status: 'confirmed' },
  { id: 's-06', agencyId: 'agency-1', agencyName: 'Byrå Nord', salesRepId: 'rep-1', salesRepName: 'Ola', productId: 'p-3', productName: 'TV', amount: 2000, commissionRate: 0.05, saleDate: '2026-04-06', status: 'confirmed' },
  { id: 's-07', agencyId: 'agency-2', agencyName: 'Byrå Sør', salesRepId: 'rep-4', salesRepName: 'Lise', productId: 'p-1', productName: 'Fiber', amount: 10000, commissionRate: 0.1, saleDate: '2026-04-07', status: 'confirmed' },
  { id: 's-08', agencyId: 'agency-1', agencyName: 'Byrå Nord', salesRepId: 'rep-2', salesRepName: 'Kari', productId: 'p-1', productName: 'Fiber', amount: 12000, commissionRate: 0.1, saleDate: '2026-04-08', status: 'confirmed' },
  { id: 's-09', agencyId: 'agency-2', agencyName: 'Byrå Sør', salesRepId: 'rep-3', salesRepName: 'Per', productId: 'p-3', productName: 'TV', amount: 3000, commissionRate: 0.05, saleDate: '2026-04-09', status: 'confirmed' },
  { id: 's-10', agencyId: 'agency-1', agencyName: 'Byrå Nord', salesRepId: 'rep-1', salesRepName: 'Ola', productId: 'p-2', productName: 'Mobil', amount: 5000, commissionRate: 0.08, saleDate: '2026-04-10', status: 'confirmed' },
];

describe('Commission Aggregation', () => {
  it('aggregerer 10 mock-salg riktig per byrå', () => {
    const result = aggregateSalesByAgency(MOCK_SALES, MOCK_AGENCIES);

    const nord = result.find((a) => a.agencyId === 'agency-1');
    const sor = result.find((a) => a.agencyId === 'agency-2');

    // agency-1: s-01, s-02, s-03, s-06, s-08, s-10 = 6 salg
    expect(nord?.salesCount).toBe(6);
    // agency-2: s-04, s-05, s-07, s-09 = 4 salg
    expect(sor?.salesCount).toBe(4);
    expect(result).toHaveLength(2);
  });

  it('beregner provisjon korrekt (amount * commissionRate)', () => {
    const result = aggregateSalesByAgency(MOCK_SALES, MOCK_AGENCIES);

    const nord = result.find((a) => a.agencyId === 'agency-1');
    // 10000*0.1 + 5000*0.1 + 3000*0.08 + 2000*0.05 + 12000*0.1 + 5000*0.08
    // = 1000 + 500 + 240 + 100 + 1200 + 400 = 3440
    expect(nord?.totalCommission).toBeCloseTo(3440, 2);

    const sor = result.find((a) => a.agencyId === 'agency-2');
    // 8000*0.1 + 4000*0.08 + 10000*0.1 + 3000*0.05
    // = 800 + 320 + 1000 + 150 = 2270
    expect(sor?.totalCommission).toBeCloseTo(2270, 2);
  });

  it('ignorerer salg med status != confirmed', () => {
    const salesWithCancelled: Sale[] = [
      ...MOCK_SALES,
      { id: 's-99', agencyId: 'agency-1', agencyName: 'Byrå Nord', salesRepId: 'rep-1', salesRepName: 'Ola', productId: 'p-1', productName: 'Fiber', amount: 99999, commissionRate: 0.1, saleDate: '2026-04-15', status: 'cancelled' },
    ];
    const result = aggregateSalesByAgency(salesWithCancelled, MOCK_AGENCIES);
    const nord = result.find((a) => a.agencyId === 'agency-1');
    expect(nord?.salesCount).toBe(6);
  });
});

describe('Commission Report', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-test-'));
    process.env.REPORTS_DIR = path.join(tempDir, 'reports');
    process.env.EXPORTS_DIR = path.join(tempDir, 'exports');
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    delete process.env.REPORTS_DIR;
    delete process.env.EXPORTS_DIR;
  });

  it('rapport får status pending_approval etter generering', async () => {
    const mockClient = {
      getSalesForPeriod: jest.fn().mockResolvedValue(MOCK_SALES),
      getAgencies: jest.fn().mockResolvedValue(MOCK_AGENCIES),
    } as unknown as GatewayClient;

    const report = await generateCommissionReport(mockClient, 'corr-test', '2026-04');
    expect(report.status).toBe('pending_approval');
    expect(report.period).toBe('2026-04');
    expect(report.id).toBeTruthy();
  });

  it('rapport får status approved etter godkjenning', async () => {
    const mockClient = {
      getSalesForPeriod: jest.fn().mockResolvedValue(MOCK_SALES),
      getAgencies: jest.fn().mockResolvedValue(MOCK_AGENCIES),
    } as unknown as GatewayClient;

    const report = await generateCommissionReport(mockClient, 'corr-test', '2026-04');
    saveReport(report);

    const updated = updateReportStatus(report.id, 'approved');
    expect(updated?.status).toBe('approved');
    expect(updated?.id).toBe(report.id);
  });

  it('PO-fil genereres med riktige linjer og totalbeløp', async () => {
    const mockClient = {
      getSalesForPeriod: jest.fn().mockResolvedValue(MOCK_SALES),
      getAgencies: jest.fn().mockResolvedValue(MOCK_AGENCIES),
    } as unknown as GatewayClient;

    const report = await generateCommissionReport(mockClient, 'corr-test', '2026-04');
    const poExport = generatePOExport(report, 'corr-test');

    expect(poExport.lineItems).toHaveLength(report.agencies.length);
    expect(poExport.currency).toBe('NOK');
    expect(poExport.totalAmount).toBeCloseTo(report.totals.totalCommission, 2);

    for (const item of poExport.lineItems) {
      expect(item.currency).toBe('NOK');
      expect(item.description).toContain(item.agencyName);
      expect(item.amount).toBeGreaterThan(0);
    }

    const lineItemTotal = poExport.lineItems.reduce((sum, item) => sum + item.amount, 0);
    expect(lineItemTotal).toBeCloseTo(poExport.totalAmount, 2);
  });
});
