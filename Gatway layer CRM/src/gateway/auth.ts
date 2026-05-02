import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import yaml from 'js-yaml';
import fs from 'fs';
import { logger } from './logger';

// ── Utvidede typer ────────────────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      serviceId?: string;
      correlationId?: string;
    }
  }
}

// ── Tilgangskontroll-konfig ───────────────────────────────────────────────────
interface ServiceConfig {
  description: string;
  connectors: Record<string, { operations: string[]; topics?: string[] }>;
}

interface AccessControlConfig {
  services: Record<string, ServiceConfig>;
}

function loadAccessControl(): AccessControlConfig {
  const path = process.env.ACCESS_CONTROL_PATH || './src/config/access-control.yaml';
  return yaml.load(fs.readFileSync(path, 'utf8')) as AccessControlConfig;
}

// ── API-nøkkel-register ───────────────────────────────────────────────────────
// Format i env: GATEWAY_API_KEYS=key1:service-a,key2:service-b
function buildKeyMap(): Map<string, string> {
  const map = new Map<string, string>();
  const raw = process.env.GATEWAY_API_KEYS || '';
  for (const pair of raw.split(',')) {
    const [key, serviceId] = pair.trim().split(':');
    if (key && serviceId) map.set(key, serviceId);
  }
  return map;
}

const keyMap = buildKeyMap();

// ── Middleware: autentisering + correlation ID ────────────────────────────────
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    logger.warn('auth_missing_key', { correlationId, path: req.path });
    return res.status(401).json({
      error: {
        code: 'AUTH_MISSING_KEY',
        message: 'x-api-key header er påkrevd',
        correlationId,
        timestamp: new Date().toISOString(),
        retryable: false,
      },
    });
  }

  const serviceId = keyMap.get(apiKey);
  if (!serviceId) {
    logger.warn('auth_invalid_key', { correlationId, path: req.path });
    return res.status(401).json({
      error: {
        code: 'AUTH_INVALID_KEY',
        message: 'Ugyldig API-nøkkel',
        correlationId,
        timestamp: new Date().toISOString(),
        retryable: false,
      },
    });
  }

  req.serviceId = serviceId;
  next();
}

// ── Middleware: tilgangskontroll per connector ────────────────────────────────
export function accessControl(connector: string, operation: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const acl = loadAccessControl();
    const serviceId = req.serviceId!;
    const serviceCfg = acl.services[serviceId];

    if (!serviceCfg) {
      logger.warn('acl_unknown_service', { serviceId, connector, operation, correlationId: req.correlationId });
      return res.status(403).json({
        error: {
          code: 'ACL_UNKNOWN_SERVICE',
          message: `Tjeneste '${serviceId}' er ikke registrert i tilgangskontroll-matrisen`,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
          retryable: false,
        },
      });
    }

    const connectorCfg = serviceCfg.connectors[connector];
    if (!connectorCfg || !connectorCfg.operations.includes(operation)) {
      logger.warn('acl_denied', { serviceId, connector, operation, correlationId: req.correlationId });
      return res.status(403).json({
        error: {
          code: 'ACL_DENIED',
          message: `Tjeneste '${serviceId}' har ikke '${operation}'-tilgang til '${connector}'`,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
          retryable: false,
        },
      });
    }

    next();
  };
}
