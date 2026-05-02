// ── KafkaEventBus — stub for produksjon (ikke implementert ennå) ──
import { EventBus } from './event-bus.interface';
import logger from '../logger';

export class KafkaEventBus implements EventBus {
  async publish(event: string, payload: unknown): Promise<void> {
    logger.warn('kafka_not_implemented', { event, payload });
    throw new Error('KafkaEventBus is not implemented');
  }

  subscribe(event: string, _handler: (payload: unknown) => Promise<void>): void {
    logger.warn('kafka_not_implemented', { event });
    throw new Error('KafkaEventBus is not implemented');
  }
}
