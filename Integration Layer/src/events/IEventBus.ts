// ── IEventBus — grensesnitt for event-systemer ──
// InMemoryEventBus brukes i dev/POC.
// KafkaEventBus implementerer samme grensesnitt i produksjon.

import { IntegrationEvent } from '../types/domain.js';

export type EventHandler = (event: IntegrationEvent) => void | Promise<void>;

export interface IEventBus {
  publish(event: IntegrationEvent): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): void;
  unsubscribe(eventType: string, handler: EventHandler): void;
}
