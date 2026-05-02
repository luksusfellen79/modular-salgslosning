// ── InMemoryEventBus — in-process pub/sub for dev og testing ──
import { EventBus } from './event-bus.interface';
import logger from '../logger';

export class InMemoryEventBus implements EventBus {
  private handlers: Map<string, Array<(payload: unknown) => Promise<void>>> = new Map();

  async publish(event: string, payload: unknown): Promise<void> {
    logger.info('event_published', { event, payload });
    const handlers = this.handlers.get(event) ?? [];
    await Promise.all(handlers.map((h) => h(payload)));
  }

  subscribe(event: string, handler: (payload: unknown) => Promise<void>): void {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(event, [...existing, handler]);
  }
}
