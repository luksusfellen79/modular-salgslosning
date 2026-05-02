// ── Connector-kontrakt ────────────────────────────────────────────────────────
// Alle connectors MÅ implementere dette grensesnittet.
// Ny connector = ny klasse som implementerer ConnectorInterface.
// Gateway-kjernen berøres ikke.

export type ConnectorCapability = 'read' | 'write' | 'consume' | 'produce' | 'stream';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  message?: string;
  checkedAt: string;
}

export interface ConnectorRegistration {
  connectorId: string;
  version: string;
  capabilities: ConnectorCapability[];
  dataSources: string[];
  healthUrl: string;
  baseUrl: string;
}

// Felles feilformat — alle connectors returnerer dette, aldri native feilkoder
export interface ConnectorError {
  code: string;
  message: string;
  source: string;
  timestamp: string;
  correlationId: string;
  retryable: boolean;
}

export interface ConnectorInterface {
  /** Connector-ID — unik per connector, f.eks. "salesforce-v1" */
  readonly connectorId: string;

  /** Sjekk om kildesystemet er tilgjengelig */
  health(): Promise<HealthStatus>;

  /** Hva støtter denne connectoren? */
  capabilities(): ConnectorCapability[];

  /** Self-registration payload */
  registrationInfo(): ConnectorRegistration;
}

// Helper: lag et standardisert ConnectorError-objekt
export function makeConnectorError(
  code: string,
  message: string,
  source: string,
  correlationId: string,
  retryable = false
): ConnectorError {
  return {
    code,
    message,
    source,
    timestamp: new Date().toISOString(),
    correlationId,
    retryable,
  };
}
