// ── InMemoryEventBus — brukes i POC og lokal dev ──
// Byttes mot KafkaEventBus i produksjon uten å endre konsumenter.

import { v4 as uuidv4 } from 'uuid';
import { IEventBus, EventHandler } from './IEventBus.js';
import { IntegrationEvent, DataSource } from '../types/domain.js';
import { logger } from '../logger.js';

export class InMemoryEventBus implements IEventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  async publish(event: IntegrationEvent): Promise<void> {
    logger.info('Event published', { eventType: event.eventType, source: event.source, eventId: event.eventId });

    const handlers = this.handlers.get(event.eventType);
    if (!handlers || handlers.size === 0) return;

    await Promise.all([...handlers].map(h => h(event)));
  }

  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    this.handlers.get(eventType)?.delete(handler);
  }

  // Hjelpemetode — publiser event med auto-generert ID og timestamp
  async emit(
    eventType: string,
    source: DataSource,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const event: IntegrationEvent = {
      eventId: uuidv4(),
      eventType,
      source,
      occurredAt: new Date().toISOString(),
      payload,
    };
    await this.publish(event);
  }
}
