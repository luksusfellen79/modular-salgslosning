// ── In-memory EventBus implementation ──
import { EventEmitter } from 'events';
import { EventBus } from './event-bus';

export class InMemoryEventBus implements EventBus {
  private emitter = new EventEmitter();

  async publish(eventName: string, payload: unknown): Promise<void> {
    this.emitter.emit(eventName, payload);
  }

  subscribe(eventName: string, handler: (payload: unknown) => Promise<void>): void {
    this.emitter.on(eventName, async (payload: unknown) => {
      await handler(payload);
    });
  }
}
