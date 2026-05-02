// ── InMemoryEventBus — brukes lokalt og i tester ──
import { EventEmitter } from 'events';
import { EventBus } from './event-bus.interface';
import logger from '../logger';

export class InMemoryEventBus implements EventBus {
  private emitter = new EventEmitter();

  async publish(eventName: string, payload: unknown): Promise<void> {
    logger.info('event_published', { eventName, payload });
    this.emitter.emit(eventName, payload);
  }

  subscribe(eventName: string, handler: (payload: unknown) => Promise<void>): void {
    this.emitter.on(eventName, (payload: unknown) => {
      handler(payload).catch((err: Error) => {
        logger.error('event_handler_error', { eventName, error: err.message });
      });
    });
    logger.info('event_subscribed', { eventName });
  }
}
