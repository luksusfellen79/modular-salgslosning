// ── Build SSE notification payloads ─
import { OfferEvent, SseNotification } from '../types';

export function buildSseNotification(event: OfferEvent): SseNotification {
  const baseNotification = {
    offerId: event.offerId,
    accountName: event.accountName,
    contactName: event.contactName,
    timestamp: event.timestamp,
  };

  if (event.type === 'viewed') {
    return {
      ...baseNotification,
      type: 'offer.viewed',
      message: `${event.accountName} åpnet tilbudet ditt — nå`,
    };
  }

  if (event.type === 'accepted') {
    return {
      ...baseNotification,
      type: 'offer.accepted',
      message: `${event.accountName} aksepterte tilbudet ditt — nå`,
    };
  }

  if (event.type === 'declined') {
    return {
      ...baseNotification,
      type: 'offer.declined',
      message: `${event.accountName} avviste tilbudet ditt — nå`,
    };
  }

  throw new Error(`Unsupported event type for SSE notification: ${event.type}`);
}
