import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from './auth';
import { listConnectors, registerConnector } from './registry';
import { logger } from './logger';
import { SalesforceConnector } from '../connectors/salesforce';
import { KafkaConnector } from '../connectors/kafka';

const app = express();
app.use(express.json());

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 60_000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'For mange forespørsler', retryable: true } },
}));

// ── Health (ingen auth — for k8s liveness probe) ──────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', connectors: listConnectors().map(c => c.connectorId) });
});

// ── Connector-registrering (intern — fra connectors ved oppstart) ──────────────
app.post('/internal/registry/register', (req, res) => {
  const reg = req.body;
  if (!reg?.connectorId) return res.status(400).json({ error: 'connectorId er påkrevd' });
  registerConnector(reg);
  res.status(201).json({ registered: true });
});

// ── Auth middleware for alle /v1/-ruter ───────────────────────────────────────
app.use('/v1', authMiddleware);

// ── Salesforce-ruter ──────────────────────────────────────────────────────────
import salesforceRouter from '../connectors/salesforce/router';
app.use('/v1/sf', salesforceRouter);

// ── Kafka-ruter ───────────────────────────────────────────────────────────────
import kafkaRouter from '../connectors/kafka/router';
app.use('/v1/kafka', kafkaRouter);

// ── Global feilhåndtering ────────────────────────────────────────────────────
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('unhandled_error', { error: err.message, stack: err.stack, correlationId: req.correlationId });
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Intern feil i gatewayen',
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      retryable: false,
    },
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.GATEWAY_PORT || '3000', 10);

async function start() {
  // Self-register connectors ved oppstart
  const sfConnector = new SalesforceConnector();
  const kafkaConnector = new KafkaConnector();

  registerConnector(sfConnector.registrationInfo());
  registerConnector(kafkaConnector.registrationInfo());

  app.listen(PORT, () => {
    logger.info('gateway_started', { port: PORT, env: process.env.GATEWAY_ENV });
  });
}

start().catch(err => {
  logger.error('startup_failed', { error: err.message });
  process.exit(1);
});

export default app;
