// ── InMemoryEventBus — brukes i POC og lokal dev ──
// Byttes mot KafkaEventBus i produksjon uten å endre konsumenter.

import { v4 as uuidv4 } from 'uuid';
import { IEventBus, EventHandler } from './IEventBus.js';
import { IntegrationEvent, DataSource } from '../types/domain.js';
import { logger } from '../logger.js';

const MAX_LOG_SIZE = 500;

export class InMemoryEventBus implements IEventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private eventLog: IntegrationEvent[] = [];
  private streamListeners = new Set<(event: IntegrationEvent) => void>();

  /** SSE / eksterne abonnenter (Workflow-modulen m.m.) */
  addStreamListener(listener: (event: IntegrationEvent) => void): () => void {
    this.streamListeners.add(listener);
    return () => this.streamListeners.delete(listener);
  }

  private notifyStreamListeners(event: IntegrationEvent): void {
    for (const listener of this.streamListeners) {
      try {
        listener(event);
      } catch (err) {
        logger.error('Stream listener error', { error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  async publish(event: IntegrationEvent): Promise<void> {
    logger.info('Event published', { eventType: event.eventType, source: event.source, eventId: event.eventId });

    // Lagre i event-logg (maks 500 entries, eldste kastes)
    this.eventLog.push(event);
    if (this.eventLog.length > MAX_LOG_SIZE) {
      this.eventLog.shift();
    }

    this.notifyStreamListeners(event);

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

  // Returner logg, valgfritt filtrert på topic (brukes av EventBusRouter /events/log)
  getLog(topicFilter?: string): IntegrationEvent[] {
    if (!topicFilter) return [...this.eventLog].reverse();
    return this.eventLog.filter(e => e.eventType === topicFilter).reverse();
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
