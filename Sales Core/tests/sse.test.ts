// ── SSE unit tests ──
import { OfferEvent, SseNotification } from '../src/types';
import { sseManager } from '../src/events/sse-manager';
import { buildSseNotification } from '../src/events/notification';

describe('SSE manager and notifications', () => {
  test('sseManager.broadcast writes to all connected clients', () => {
    const resA = { write: jest.fn(), writableEnded: false } as any;
    const resB = { write: jest.fn(), writableEnded: false } as any;

    sseManager.addConnection('a', resA);
    sseManager.addConnection('b', resB);

    const notification: SseNotification = {
      type: 'offer.viewed',
      offerId: 'offer-001',
      accountName: 'Parkveien Borettslag',
      contactName: 'Erik Andersen',
      timestamp: new Date().toISOString(),
      message: 'Parkveien Borettslag åpnet tilbudet ditt — nå',
    };

    sseManager.broadcast(notification);

    expect(resA.write).toHaveBeenCalledWith(`data: ${JSON.stringify(notification)}\n\n`);
    expect(resB.write).toHaveBeenCalledWith(`data: ${JSON.stringify(notification)}\n\n`);

    sseManager.removeConnection('a');
    sseManager.removeConnection('b');
  });

  test('buildSseNotification formats viewed events correctly', () => {
    const event: OfferEvent = {
      id: 'e1',
      offerId: 'offer-001',
      opportunityId: 'opp-001',
      accountName: 'Parkveien Borettslag',
      contactName: 'Erik Andersen',
      type: 'viewed',
      timestamp: '2026-05-02T12:00:00.000Z',
    };

    const notification = buildSseNotification(event);
    expect(notification).toEqual({
      type: 'offer.viewed',
      offerId: 'offer-001',
      accountName: 'Parkveien Borettslag',
      contactName: 'Erik Andersen',
      timestamp: '2026-05-02T12:00:00.000Z',
      message: 'Parkveien Borettslag åpnet tilbudet ditt — nå',
    });
  });

  test('buildSseNotification formats accepted events correctly', () => {
    const event: OfferEvent = {
      id: 'e2',
      offerId: 'offer-001',
      opportunityId: 'opp-001',
      accountName: 'Parkveien Borettslag',
      contactName: 'Erik Andersen',
      type: 'accepted',
      timestamp: '2026-05-02T12:00:00.000Z',
    };

    const notification = buildSseNotification(event);
    expect(notification.message).toBe('Parkveien Borettslag aksepterte tilbudet ditt — nå');
    expect(notification.type).toBe('offer.accepted');
  });

  test('buildSseNotification formats declined events correctly', () => {
    const event: OfferEvent = {
      id: 'e3',
      offerId: 'offer-001',
      opportunityId: 'opp-001',
      accountName: 'Parkveien Borettslag',
      contactName: 'Erik Andersen',
      type: 'declined',
      timestamp: '2026-05-02T12:00:00.000Z',
    };

    const notification = buildSseNotification(event);
    expect(notification.message).toBe('Parkveien Borettslag avviste tilbudet ditt — nå');
    expect(notification.type).toBe('offer.declined');
  });
});
