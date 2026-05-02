import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import {
  ConnectorInterface,
  ConnectorCapability,
  ConnectorRegistration,
  HealthStatus,
} from '../base/connector.interface';
import { logger } from '../../gateway/logger';

// ── Kafka-connector ───────────────────────────────────────────────────────────

function buildKafkaClient(): Kafka {
  const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
  return new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'crm-gateway',
    brokers,
    ssl: process.env.KAFKA_SSL === 'true',
    sasl: process.env.KAFKA_SASL_USERNAME
      ? {
          mechanism: 'plain',
          username: process.env.KAFKA_SASL_USERNAME,
          password: process.env.KAFKA_SASL_PASSWORD || '',
        }
      : undefined,
  });
}

export const kafka = buildKafkaClient();
export const kafkaProducer: Producer = kafka.producer();
export let producerConnected = false;

export async function connectProducer() {
  if (!producerConnected) {
    await kafkaProducer.connect();
    producerConnected = true;
    logger.info('kafka_producer_connected');
  }
}

export async function publishMessage(topic: string, key: string | null, value: object) {
  await connectProducer();
  await kafkaProducer.send({
    topic,
    messages: [{ key: key ?? undefined, value: JSON.stringify(value) }],
  });
}

export async function createConsumer(
  groupId: string,
  topics: string[],
  handler: (payload: EachMessagePayload) => Promise<void>
): Promise<Consumer> {
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }
  await consumer.run({ eachMessage: handler });
  logger.info('kafka_consumer_started', { groupId, topics });
  return consumer;
}

export class KafkaConnector implements ConnectorInterface {
  readonly connectorId = 'kafka-v1';

  capabilities(): ConnectorCapability[] {
    return ['consume', 'produce', 'stream'];
  }

  registrationInfo(): ConnectorRegistration {
    return {
      connectorId: this.connectorId,
      version: '1.0.0',
      capabilities: this.capabilities(),
      dataSources: ['kafka-topics'],
      healthUrl: `http://localhost:${process.env.GATEWAY_PORT || 3000}/v1/kafka/health`,
      baseUrl: `http://localhost:${process.env.GATEWAY_PORT || 3000}/v1/kafka`,
    };
  }

  async health(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const admin = kafka.admin();
      await admin.connect();
      await admin.listTopics();
      await admin.disconnect();
      return { status: 'healthy', latencyMs: Date.now() - start, checkedAt: new Date().toISOString() };
    } catch (err: any) {
      return { status: 'unhealthy', latencyMs: Date.now() - start, message: err.message, checkedAt: new Date().toISOString() };
    }
  }
}
