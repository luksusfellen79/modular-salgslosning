import { ConnectorRegistration } from '../connectors/base/connector.interface';
import { logger } from './logger';

// ── Connector-register ────────────────────────────────────────────────────────
// Connectors melder seg inn her ved oppstart (self-registration).
// Gatewayen trenger ingen statisk konfigurasjon per connector.

const registry = new Map<string, ConnectorRegistration & { registeredAt: string }>();

export function registerConnector(reg: ConnectorRegistration): void {
  registry.set(reg.connectorId, { ...reg, registeredAt: new Date().toISOString() });
  logger.info('connector_registered', {
    connectorId: reg.connectorId,
    version: reg.version,
    capabilities: reg.capabilities,
  });
}

export function getConnector(connectorId: string) {
  return registry.get(connectorId);
}

export function listConnectors() {
  return Array.from(registry.values());
}

export function deregisterConnector(connectorId: string): void {
  registry.delete(connectorId);
  logger.info('connector_deregistered', { connectorId });
}
