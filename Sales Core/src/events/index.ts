// ── Singleton eventBus export ──
import { InMemoryEventBus } from './in-memory-event-bus';

export const eventBus = new InMemoryEventBus();
