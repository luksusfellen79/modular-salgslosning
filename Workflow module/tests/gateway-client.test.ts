// ── Tests for GatewayClient mock data and error handling ──
import axios from 'axios';
import { GatewayClient, GatewayError } from '../src/gateway/gateway-client';

jest.mock('axios');
const mockedGet = jest.mocked(axios.get);

describe('GatewayClient', () => {
  const client = new GatewayClient('http://localhost:3000', 'test-key');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('development mode', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeAll(() => {
      process.env.NODE_ENV = 'development';
    });

    afterAll(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('returnerer mock-data for getSalesForPeriod i development-modus', async () => {
      const sales = await client.getSalesForPeriod('2026-04-01', '2026-04-30', 'corr-1');
      expect(sales.length).toBeGreaterThanOrEqual(10);
      expect(sales[0]).toHaveProperty('id');
      expect(sales[0]).toHaveProperty('agencyId');
      expect(sales[0]).toHaveProperty('amount');
      expect(sales[0]).toHaveProperty('commissionRate');
    });

    it('returnerer mock-data for getAgencies i development-modus', async () => {
      const agencies = await client.getAgencies('corr-1');
      expect(agencies).toHaveLength(3);
      expect(agencies[0]).toHaveProperty('id');
      expect(agencies[0]).toHaveProperty('contactEmail');
      expect(agencies[0]).toHaveProperty('managerId');
    });

    it('returnerer ikke mock-data fra axios i development-modus', async () => {
      await client.getSalesForPeriod('2026-04-01', '2026-04-30', 'corr-1');
      expect(mockedGet).not.toHaveBeenCalled();
    });
  });

  describe('error handling (production mode)', () => {
    const originalEnv = process.env.NODE_ENV;
    let isAxiosErrorSpy: jest.SpyInstance;

    beforeAll(() => {
      process.env.NODE_ENV = 'production';
    });

    afterAll(() => {
      process.env.NODE_ENV = originalEnv;
    });

    beforeEach(() => {
      isAxiosErrorSpy = jest.spyOn(axios, 'isAxiosError').mockReturnValue(true as never);
    });

    afterEach(() => {
      isAxiosErrorSpy.mockRestore();
    });

    it('kaster GatewayError på HTTP 502 for getSalesForPeriod', async () => {
      const axiosError = { response: { status: 502, data: 'Bad Gateway' } };
      mockedGet.mockRejectedValue(axiosError);

      await expect(
        client.getSalesForPeriod('2026-04-01', '2026-04-30', 'corr-1')
      ).rejects.toThrow(GatewayError);

      await expect(
        client.getSalesForPeriod('2026-04-01', '2026-04-30', 'corr-1')
      ).rejects.toThrow('Gateway returned 502');
    });

    it('kaster GatewayError på HTTP 502 for getAgencies', async () => {
      const axiosError = { response: { status: 502, data: 'Bad Gateway' } };
      mockedGet.mockRejectedValue(axiosError);

      await expect(client.getAgencies('corr-1')).rejects.toThrow(GatewayError);
    });

    it('re-kaster ikke-axios feil uendret', async () => {
      isAxiosErrorSpy.mockReturnValue(false as never);
      mockedGet.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(
        client.getSalesForPeriod('2026-04-01', '2026-04-30', 'corr-1')
      ).rejects.toThrow('ECONNREFUSED');
    });
  });
});
