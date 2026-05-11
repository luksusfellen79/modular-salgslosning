// ── KafkaStub — produksjonsklar Kafka-integrasjon ──
// Denne klassen er et scaffold for ekte KafkaJS-integrasjon.
// Aktiver med KAFKA_ENABLED=true og KAFKA_BROKERS i .env.
//
// For å aktivere i produksjon:
//   1. npm install kafkajs
//   2. Erstatt stub-implementasjonen under med ekte KafkaJS-kode
//   3. Sett KAFKA_ENABLED=true i Railway-miljøvariabler
//
// Eksempel på topics vi vil konsumere fra Telenors systemer:
//   - telenor.fiber.customer.updated
//   - telenor.mobile.subscription.changed
//   - telenor.pricing.campaign.activated
//   - telenor.tv.product.updated

import { logger } from '../logger.js';
import { InMemoryEventBus } from './InMemoryEventBus.js';

export interface KafkaConfig {
  brokers: string[];
  groupId: string;
  topics: string[];
}

export class KafkaStub {
  private enabled: boolean;
  private config: KafkaConfig;
  private eventBus: InMemoryEventBus;

  constructor(config: KafkaConfig, eventBus: InMemoryEventBus) {
    this.config = config;
    this.eventBus = eventBus;
    this.enabled = process.env.KAFKA_ENABLED === 'true';
  }

  async connect(): Promise<void> {
    if (!this.enabled) {
      logger.info('Kafka disabled — bruker InMemoryEventBus', { mode: 'mock' });
      return;
    }

    // TODO: erstatt med ekte KafkaJS-implementasjon
    // const { Kafka } = await import('kafkajs');
    // const kafka = new Kafka({ clientId: 'integration-layer', brokers: this.config.brokers });
    // const consumer = kafka.consumer({ groupId: this.config.groupId });
    // await consumer.connect();
    // await consumer.subscribe({ topics: this.config.topics, fromBeginning: false });
    // await consumer.run({
    //   eachMessage: async ({ topic, message }) => {
    //     const payload = JSON.parse(message.value?.toString() ?? '{}');
    //     await this.eventBus.emit(topic, 'kafka', payload);
    //   },
    // });

    logger.warn('KafkaStub: KAFKA_ENABLED=true men KafkaJS ikke implementert ennå');
  }

  async disconnect(): Promise<void> {
    if (!this.enabled) return;
    logger.info('Kafka disconnected');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getConfig(): KafkaConfig {
    return this.config;
  }
}
