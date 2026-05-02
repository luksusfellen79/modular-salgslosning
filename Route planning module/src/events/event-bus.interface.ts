// ── EventBus — interface for publish/subscribe ──

export interface EventBus {
  publish(event: string, payload: unknown): Promise<void>;
  subscribe(event: string, handler: (payload: unknown) => Promise<void>): void;
}
