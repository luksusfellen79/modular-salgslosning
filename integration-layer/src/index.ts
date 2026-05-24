// ── Integration Layer — entry point ──
// Starter Express, registrerer adaptere og monterer API-ruter.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { logger } from './logger.js';
import { InMemoryCache } from './cache/InMemoryCache.js';
import { InMemoryEventBus } from './events/InMemoryEventBus.js';
import { KafkaStub } from './events/KafkaStub.js';
import { AdapterRegistry } from './registry/AdapterRegistry.js';

import { FiberAdapter } from './adapters/fiber/FiberAdapter.js';
import { MobileAdapter } from './adapters/mobile/MobileAdapter.js';
import { TvAdapter } from './adapters/tv/TvAdapter.js';
import { PricingAdapter } from './adapters/pricing/PricingAdapter.js';
import { CustomerAdapter } from './adapters/customer/CustomerAdapter.js';

import { createProductsRouter } from './api/products.js';
import { createCustomersRouter } from './api/customers.js';
import { createPricingRouter } from './api/pricing.js';
import { createCustomerAdapterRouter } from './adapters/customer/CustomerRouter.js';
import { createSduProductsRouter } from './api/sdu-products.js';
import { createMduProductsRouter } from './api/mdu-products.js';
import { createEventBusRouter } from './events/EventBusRouter.js';
import { correlationIdMiddleware } from './middleware/jwt.middleware.js';
import { HealthResponse } from './types/domain.js';

const PORT = parseInt(process.env.PORT ?? process.env.INTEGRATION_PORT ?? '3010', 10);
const startedAt = Date.now();

// ─── Infrastruktur ──────────────────────────────────────────────────────────────────

const cache = new InMemoryCache(60);
const eventBus = new InMemoryEventBus();
const registry = new AdapterRegistry(cache);

// ─── Registrer adaptere ─────────────────────────────────────────────────────────────

const fiberAdapter = new FiberAdapter();
const mobileAdapter = new MobileAdapter();
const tvAdapter = new TvAdapter();
const pricingAdapter = new PricingAdapter();
const customerAdapter = new CustomerAdapter();

// Produkt-adaptere
registry.registerProductAdapter(fiberAdapter);
registry.registerProductAdapter(mobileAdapter);
registry.registerProductAdapter(tvAdapter);
registry.registerPricingAdapter(pricingAdapter);

// FiberAdapter leverer beboerdata (SDU) — samme bygg-ID-er som Sales Core/KAS Core mock
registry.registerCustomerAdapter(fiberAdapter);
// CustomerAdapter (MDU kundeintelligens) eksponeres kun via /adapters/customer/*

// ─── Kafka (stub i POC — aktiveres med KAFKA_ENABLED=true) ─────────────────────

const kafkaStub = new KafkaStub(
  {
    brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
    groupId: process.env.KAFKA_GROUP_ID ?? 'integration-layer',
    topics: [
      'telenor.fiber.customer.updated',
      'telenor.mobile.subscription.changed',
      'telenor.pricing.campaign.activated',
      'telenor.tv.product.updated',
    ],
  },
  eventBus,
);

// Eksempel på event-handler — Incentive Manager lytter på visit.completed
eventBus.subscribe('visit.completed', async (event) => {
  logger.info('Visit completed — trigger incentive calculation', { payload: event.payload });
});

eventBus.subscribe('telenor.pricing.campaign.activated', async (event) => {
  logger.info('Campaign activated via event', { campaignId: event.payload.campaignId });
  cache.delete('campaigns:all');
});

// ─── Express-oppsett ───────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(correlationIdMiddleware);     // correlation-ID tidlig i kjeden

// ─── Helse-endepunkt ───────────────────────────────────────────────────────────────

app.get('/health', async (_req, res) => {
  const adapters = await registry.getAdapterHealth();
  const allHealthy = adapters.every(a => a.healthy);
  const anyHealthy = adapters.some(a => a.healthy);

  const status: HealthResponse['status'] = allHealthy ? 'healthy' : anyHealthy ? 'degraded' : 'unhealthy';

  const response: HealthResponse = {
    status,
    adapters,
    cachedEntries: registry.getCacheSize(),
    uptime: Math.round((Date.now() - startedAt) / 1000),
  };

  res.status(allHealthy ? 200 : 207).json(response);
});

// ─── API-ruter ──────────────────────────────────────────────────────────────────────

// Produktkatalog — SDU/MDU-ruter må registreres før /:productId
app.use('/products', createSduProductsRouter(eventBus));
app.use('/products', createMduProductsRouter());
app.use('/products', createProductsRouter(registry));

// Kunder og beboere (bakoverkompatibelt med KAS Core mock URL-er)
app.use('/', createCustomersRouter(registry, { fiberAdapter, eventBus, cache }));

// Prising og kampanjer
app.use('/pricing', createPricingRouter(registry));

// CustomerAdapter — ny master for SDU/MDU kundeintelligens
app.use('/adapters/customer', createCustomerAdapterRouter());

// EventBus — HTTP-grensesnitt
app.use('/events', createEventBusRouter(eventBus));

// ─── Start ────────────────────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  await kafkaStub.connect();

  app.listen(PORT, () => {
    logger.info('Integration Layer started', {
      port: PORT,
      kafkaEnabled: kafkaStub.isEnabled(),
      adapters: [
        fiberAdapter.name,
        mobileAdapter.name,
        tvAdapter.name,
        pricingAdapter.name,
        customerAdapter.name,
      ],
    });
  });
}

start().catch(err => {
  logger.error('Failed to start Integration Layer', { error: err });
  process.exit(1);
});

export { app, registry, eventBus };
