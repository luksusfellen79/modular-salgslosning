// ── Entry point: wires up all modules and starts the HTTP server ──
import 'dotenv/config';
import express from 'express';
import { EventBus } from './events/event-bus.interface';
import { InMemoryEventBus } from './events/in-memory-event-bus';
import { KafkaEventBus } from './events/kafka-event-bus';
import { GatewayClient } from './gateway/gateway-client';
import { WorkflowEngine } from './workflows/workflow-engine';
import { createRouter } from './api/router';
import { setupCronJobs } from './scheduler/cron';
import { connectIntegrationLayerEvents, registerPlatformWorkflowHandlers } from './workflows/platform-event-handler';
import logger from './logger';

function createEventBus(): EventBus {
  const busType = process.env.EVENT_BUS_TYPE ?? 'inmemory';
  if (busType === 'kafka') return new KafkaEventBus();
  return new InMemoryEventBus();
}

async function main(): Promise<void> {
  const eventBus = createEventBus();
  const gatewayClient = new GatewayClient(
    process.env.GATEWAY_URL ?? 'http://localhost:3000',
    process.env.GATEWAY_API_KEY ?? ''
  );
  const engine = new WorkflowEngine(eventBus, gatewayClient);

  registerPlatformWorkflowHandlers(eventBus);

  const integrationLayerUrl = process.env.INTEGRATION_LAYER_URL;
  if (integrationLayerUrl) {
    connectIntegrationLayerEvents(eventBus, integrationLayerUrl);
    logger.info('integration_layer_events_enabled', { integrationLayerUrl });
  } else {
    logger.warn('integration_layer_events_disabled', { reason: 'INTEGRATION_LAYER_URL not set' });
  }

  setupCronJobs(async () => { await engine.runMonthlyCommission(); });

  const app = express();
  app.use(express.json());
  app.use(createRouter(engine));

  const port = parseInt(process.env.PORT ?? process.env.WORKFLOW_PORT ?? '3002', 10);
  app.listen(port, () => {
    logger.info('server_started', { port, nodeEnv: process.env.NODE_ENV ?? 'development' });
  });
}

main().catch((err: Error) => {
  logger.error('startup_failed', { error: err.message });
  process.exit(1);
});
