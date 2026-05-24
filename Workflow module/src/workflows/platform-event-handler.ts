// ── Kobler plattform-events fra Integration Layer til lokal EventBus ──
import { EventBus } from '../events/event-bus.interface';
import { IntegrationLayerEvent, IntegrationLayerSubscriber } from '../events/integration-layer-subscriber';
import logger from '../logger';

const PLATFORM_TOPICS = new Set([
  'sale.created',
  'sale.status_changed',
  'sale.won',
  'sale.lost',
  'sale.sent_to_war_room',
  'sale.war_room_approved',
  'sale.war_room_rejected',
  'visit.completed',
  'round.created',
  'round.completed',
  'incentive.triggered',
  'bonus.calculated',
  'customer.created',
]);

export function connectIntegrationLayerEvents(
  localBus: EventBus,
  integrationLayerUrl: string,
): IntegrationLayerSubscriber {
  const subscriber = new IntegrationLayerSubscriber(integrationLayerUrl);

  subscriber.onEvent((event: IntegrationLayerEvent) => {
    if (!PLATFORM_TOPICS.has(event.eventType)) return;

    logger.info('platform_event_received', {
      eventType: event.eventType,
      source: event.source,
      eventId: event.eventId,
    });

    void localBus.publish(event.eventType, {
      ...event.payload,
      _meta: {
        eventId: event.eventId,
        source: event.source,
        occurredAt: event.occurredAt,
      },
    });
  });

  subscriber.start();
  return subscriber;
}

export function registerPlatformWorkflowHandlers(localBus: EventBus): void {
  localBus.subscribe('visit.completed', async (payload: unknown) => {
    logger.info('workflow_visit_completed', { payload });
  });

  localBus.subscribe('sale.created', async (payload: unknown) => {
    logger.info('workflow_sale_created', { payload });
  });

  localBus.subscribe('bonus.calculated', async (payload: unknown) => {
    logger.info('workflow_bonus_calculated', { payload });
  });

  localBus.subscribe('round.completed', async (payload: unknown) => {
    logger.info('workflow_round_completed', { payload });
  });
}
