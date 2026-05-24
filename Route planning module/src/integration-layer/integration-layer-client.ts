// ── IntegrationLayerClient — beboerdata fra Integration Layer ──
import axios from 'axios';
import logger from '../logger';

export interface Resident {
  unitId: string;
  name: string;
  isExistingCustomer: boolean;
  existingProducts: string[];
}

export class IntegrationLayerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IntegrationLayerError';
  }
}

const DEFAULT_URL = 'http://localhost:3010';

export class IntegrationLayerClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env.INTEGRATION_LAYER_URL ?? DEFAULT_URL;
  }

  async getResidentsForBuilding(buildingId: string, correlationId: string): Promise<Resident[]> {
    try {
      const url = `${this.baseUrl}/buildings/${buildingId}/residents`;
      const response = await axios.get<Resident[]>(url, {
        headers: { 'x-correlation-id': correlationId },
        timeout: 10_000,
      });
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('integration_layer_error', { error: message, buildingId, correlationId });
      throw new IntegrationLayerError(
        `Failed to fetch residents for building ${buildingId}: ${message}`,
      );
    }
  }
}
