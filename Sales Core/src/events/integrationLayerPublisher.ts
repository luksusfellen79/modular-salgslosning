// ── Publiser hendelser til Integration Layer EventBus ──
import { logger } from '../logger';
import { EventTopic } from './topics';

const INTEGRATION_LAYER_URL =
  process.env.INTEGRATION_LAYER_URL
  ?? 'https://integration-layer-production.up.railway.app';

export async function publishIntegrationEvent(
  topic: EventTopic,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const res = await fetch(`${INTEGRATION_LAYER_URL}/events/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        payload,
        source: 'sales-core',
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.warn({
        message: 'Integration Layer event publish failed',
        topic,
        status: res.status,
        body,
      });
    }
  } catch (err) {
    logger.warn({
      message: 'Integration Layer event publish error',
      topic,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Fire-and-forget — blokkerer ikke API-respons */
export function emitIntegrationEvent(
  topic: EventTopic,
  payload: Record<string, unknown>,
): void {
  void publishIntegrationEvent(topic, payload);
}
