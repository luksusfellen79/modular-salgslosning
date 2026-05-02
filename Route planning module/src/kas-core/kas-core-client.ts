// ── KasCoreClient — beboerdata fra KAS Core (mock i dev) ──
import axios from 'axios';
import logger from '../logger';

export interface Resident {
  unitId: string;
  name: string;
  isExistingCustomer: boolean;
  existingProducts: string[];
}

export class KasCoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KasCoreError';
  }
}

const MOCK_NAMES = [
  'Kari Nordmann', 'Ole Hansen', 'Ingrid Bakke', 'Lars Johansen', 'Astrid Berg',
  'Erik Dahl', 'Silje Moe', 'Tor Andersen', 'Hanne Nilsen', 'Bjørn Lund',
  'Marte Vik', 'Per Svendsen', 'Else Haugen', 'Gunnar Strand', 'Randi Holm',
  'Svein Karlsen', 'Turid Olsen', 'Finn Eriksen', 'Marit Larsen', 'Arne Lie',
];

const ALL_PRODUCTS = ['Fiber 500', 'Fiber 1000', 'TV Basis', 'Mobil Premium'];

function pickProducts(): string[] {
  const count = Math.floor(Math.random() * 2) + 1;
  return ALL_PRODUCTS.slice(0, count);
}

function buildMockResidents(buildingId: string, totalUnits: number, existingCustomerCount: number): Resident[] {
  const residents: Resident[] = [];
  for (let i = 0; i < totalUnits; i++) {
    const isExisting = i < existingCustomerCount;
    residents.push({
      unitId: `${buildingId}-unit-${i + 1}`,
      name: MOCK_NAMES[i % MOCK_NAMES.length] ?? `Beboer ${i + 1}`,
      isExistingCustomer: isExisting,
      existingProducts: isExisting ? pickProducts() : [],
    });
  }
  return residents;
}

const MOCK_DATA: Record<string, { total: number; existing: number }> = {
  'building-1': { total: 24, existing: 6 },
  'building-2': { total: 18, existing: 4 },
  'building-3': { total: 12, existing: 2 },
};

export class KasCoreClient {
  async getResidentsForBuilding(buildingId: string, correlationId: string): Promise<Resident[]> {
    if (process.env.NODE_ENV === 'development' || !process.env.KASCORE_URL) {
      logger.info('kas_core_mock', { buildingId, correlationId });
      const cfg = MOCK_DATA[buildingId] ?? { total: 10, existing: 2 };
      return buildMockResidents(buildingId, cfg.total, cfg.existing);
    }

    try {
      const url = `${process.env.KASCORE_URL}/buildings/${buildingId}/residents`;
      const response = await axios.get<Resident[]>(url, {
        headers: {
          'x-api-key': process.env.KASCORE_API_KEY ?? '',
          'x-correlation-id': correlationId,
        },
      });
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('kas_core_error', { error: message, buildingId, correlationId });
      throw new KasCoreError(`Failed to fetch residents for building ${buildingId}: ${message}`);
    }
  }
}
