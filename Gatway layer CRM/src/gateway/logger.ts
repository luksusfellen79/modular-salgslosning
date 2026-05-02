import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'crm-gateway' },
  transports: [new winston.transports.Console()],
});

// Strukturert logg-helper — alle lag bruker dette formatet
export function logRequest(opts: {
  correlationId: string;
  callerService: string;
  operation: string;
  durationMs: number;
  status: 'success' | 'error';
  errorCode?: string;
}) {
  logger.info('request', opts);
}
