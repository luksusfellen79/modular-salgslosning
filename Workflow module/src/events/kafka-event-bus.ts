// ── KafkaEventBus stub — kobles til ved integrasjon mot Telenor Kafka ──
import { EventBus } from './event-bus.interface';

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

export class KafkaEventBus implements EventBus {
  async publish(_eventName: string, _payload: unknown): Promise<void> {
    throw new NotImplementedError(
      'KafkaEventBus er ikke implementert ennå — kobles til ved integrasjon mot Telenor Kafka'
    );
  }

  subscribe(_eventName: string, _handler: (payload: unknown) => Promise<void>): void {
    throw new NotImplementedError(
      'KafkaEventBus er ikke implementert ennå — kobles til ved integrasjon mot Telenor Kafka'
    );
  }
}
