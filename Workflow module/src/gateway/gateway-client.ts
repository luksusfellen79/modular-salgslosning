// ── Typed HTTP client against CRM Gateway ──
import axios from 'axios';
import logger from '../logger';
import { Sale, Agency } from './types';

export class GatewayError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'GatewayError';
  }
}

const MOCK_AGENCIES: Agency[] = [
  { id: 'agency-1', name: 'Byrå Nord', contactEmail: 'nord@example.com', managerId: 'mgr-1' },
  { id: 'agency-2', name: 'Byrå Sør', contactEmail: 'sor@example.com', managerId: 'mgr-2' },
  { id: 'agency-3', name: 'Byrå Vest', contactEmail: 'vest@example.com', managerId: 'mgr-3' },
];

const MOCK_SALES: Sale[] = [
  { id: 's-01', agencyId: 'agency-1', agencyName: 'Byrå Nord', salesRepId: 'rep-1', salesRepName: 'Ola Nordmann', productId: 'p-fiber', productName: 'Fiber 500', amount: 12000, commissionRate: 0.08, saleDate: '2026-04-03', status: 'confirmed' },
  { id: 's-02', agencyId: 'agency-1', agencyName: 'Byrå Nord', salesRepId: 'rep-1', salesRepName: 'Ola Nordmann', productId: 'p-mobil', productName: 'Mobil Premium', amount: 4500, commissionRate: 0.06, saleDate: '2026-04-07', status: 'confirmed' },
  { id: 's-03', agencyId: 'agency-1', agencyName: 'Byrå Nord', salesRepId: 'rep-2', salesRepName: 'Kari Hansen', productId: 'p-fiber', productName: 'Fiber 500', amount: 12000, commissionRate: 0.08, saleDate: '2026-04-10', status: 'confirmed' },
  { id: 's-04', agencyId: 'agency-2', agencyName: 'Byrå Sør', salesRepId: 'rep-3', salesRepName: 'Per Sørensen', productId: 'p-fiber', productName: 'Fiber 500', amount: 12000, commissionRate: 0.08, saleDate: '2026-04-05', status: 'confirmed' },
  { id: 's-05', agencyId: 'agency-2', agencyName: 'Byrå Sør', salesRepId: 'rep-3', salesRepName: 'Per Sørensen', productId: 'p-tv', productName: 'TV Basis', amount: 3000, commissionRate: 0.05, saleDate: '2026-04-12', status: 'confirmed' },
  { id: 's-06', agencyId: 'agency-2', agencyName: 'Byrå Sør', salesRepId: 'rep-4', salesRepName: 'Lise Dahl', productId: 'p-mobil', productName: 'Mobil Premium', amount: 4500, commissionRate: 0.06, saleDate: '2026-04-15', status: 'confirmed' },
  { id: 's-07', agencyId: 'agency-2', agencyName: 'Byrå Sør', salesRepId: 'rep-4', salesRepName: 'Lise Dahl', productId: 'p-fiber', productName: 'Fiber 1000', amount: 15000, commissionRate: 0.08, saleDate: '2026-04-18', status: 'confirmed' },
  { id: 's-08', agencyId: 'agency-3', agencyName: 'Byrå Vest', salesRepId: 'rep-5', salesRepName: 'Bjørn Vestlund', productId: 'p-fiber', productName: 'Fiber 500', amount: 12000, commissionRate: 0.08, saleDate: '2026-04-06', status: 'confirmed' },
  { id: 's-09', agencyId: 'agency-3', agencyName: 'Byrå Vest', salesRepId: 'rep-5', salesRepName: 'Bjørn Vestlund', productId: 'p-mobil', productName: 'Mobil Premium', amount: 4500, commissionRate: 0.06, saleDate: '2026-04-14', status: 'confirmed' },
  { id: 's-10', agencyId: 'agency-3', agencyName: 'Byrå Vest', salesRepId: 'rep-6', salesRepName: 'Silje Berg', productId: 'p-tv', productName: 'TV Basis', amount: 3000, commissionRate: 0.05, saleDate: '2026-04-20', status: 'confirmed' },
  { id: 's-11', agencyId: 'agency-1', agencyName: 'Byrå Nord', salesRepId: 'rep-2', salesRepName: 'Kari Hansen', productId: 'p-tv', productName: 'TV Basis', amount: 3000, commissionRate: 0.05, saleDate: '2026-04-22', status: 'confirmed' },
  { id: 's-12', agencyId: 'agency-3', agencyName: 'Byrå Vest', salesRepId: 'rep-6', salesRepName: 'Silje Berg', productId: 'p-fiber', productName: 'Fiber 1000', amount: 15000, commissionRate: 0.08, saleDate: '2026-04-25', status: 'confirmed' },
];

export class GatewayClient {
  constructor(private baseUrl: string, private apiKey: string) {}

  async getSalesForPeriod(fromDate: string, toDate: string, correlationId: string): Promise<Sale[]> {
    if (process.env.NODE_ENV === 'development') {
      logger.info('gateway_mock_sales', { correlationId, fromDate, toDate, count: MOCK_SALES.length });
      return MOCK_SALES;
    }

    const start = Date.now();
    try {
      const response = await axios.get<Sale[]>(`${this.baseUrl}/api/sales`, {
        params: { fromDate, toDate },
        headers: { 'x-api-key': this.apiKey, 'x-correlation-id': correlationId },
      });
      logger.info('gateway_get_sales', { correlationId, durationMs: Date.now() - start, count: response.data.length });
      return response.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        throw new GatewayError(`Gateway returned ${err.response.status}`, err.response.status);
      }
      throw err;
    }
  }

  async getAgencies(correlationId: string): Promise<Agency[]> {
    if (process.env.NODE_ENV === 'development') {
      logger.info('gateway_mock_agencies', { correlationId, count: MOCK_AGENCIES.length });
      return MOCK_AGENCIES;
    }

    const start = Date.now();
    try {
      const response = await axios.get<Agency[]>(`${this.baseUrl}/api/agencies`, {
        headers: { 'x-api-key': this.apiKey, 'x-correlation-id': correlationId },
      });
      logger.info('gateway_get_agencies', { correlationId, durationMs: Date.now() - start, count: response.data.length });
      return response.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        throw new GatewayError(`Gateway returned ${err.response.status}`, err.response.status);
      }
      throw err;
    }
  }
}
