import {
  ConnectorInterface,
  ConnectorCapability,
  ConnectorRegistration,
  HealthStatus,
} from '../base/connector.interface';
import { getSalesforceToken } from './auth';
import { sfGet } from './restApi';
import { logger } from '../../gateway/logger';

export class SalesforceConnector implements ConnectorInterface {
  readonly connectorId = 'salesforce-v1';

  capabilities(): ConnectorCapability[] {
    return ['read', 'write'];
  }

  registrationInfo(): ConnectorRegistration {
    return {
      connectorId: this.connectorId,
      version: '1.0.0',
      capabilities: this.capabilities(),
      dataSources: ['Account', 'Contact', 'Case', 'Opportunity', 'Lead', 'Task'],
      healthUrl: `http://localhost:${process.env.GATEWAY_PORT || 3000}/v1/sf/health`,
      baseUrl: `http://localhost:${process.env.GATEWAY_PORT || 3000}/v1/sf`,
    };
  }

  async health(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      await getSalesforceToken();
      await sfGet('/limits', 'health-check');
      return {
        status: 'healthy',
        latencyMs: Date.now() - start,
        checkedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      logger.warn('sf_health_failed', { error: err.message });
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        message: err.message,
        checkedAt: new Date().toISOString(),
      };
    }
  }
}

export { sfGet, sfPost, sfPatch, sfDelete, sfQuery } from './restApi';
