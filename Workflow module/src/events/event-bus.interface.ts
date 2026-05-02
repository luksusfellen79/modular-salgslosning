// ── EventBus abstraction — swap transport by changing one line in index.ts ──
export interface EventBus {
  publish(eventName: string, payload: unknown): Promise<void>;
  subscribe(eventName: string, handler: (payload: unknown) => Promise<void>): void;
}
