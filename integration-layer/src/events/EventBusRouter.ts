// ── EventBusRouter — HTTP-grensesnitt for EventBus ──
// POST /events/publish     — publiser en hendelse
// GET  /events/topics      — alle gyldige topic-navn
// GET  /events/log         — siste hendelser (kun dev)

import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { InMemoryEventBus } from './InMemoryEventBus.js';
import { ALL_TOPICS } from './EventTopics.js';
import { IntegrationEvent, DataSource } from '../types/domain.js';

export function createEventBusRouter(eventBus: InMemoryEventBus): Router {
  const router = Router();

  // POST /events/publish
  // Body: { topic: string, payload: object, source: string }
  router.post('/publish', async (req: Request, res: Response) => {
    const { topic, payload, source } = req.body as {
      topic?: string;
      payload?: Record<string, unknown>;
      source?: string;
    };

    if (!topic || !payload || !source) {
      return res.status(400).json({
        error: { code: 'MANGLER_FELT', message: 'topic, payload og source er påkrevd' },
      });
    }

    if (!ALL_TOPICS.includes(topic as any)) {
      return res.status(400).json({
        error: {
          code: 'UGYLDIG_TOPIC',
          message: `Ukjent topic: ${topic}. Gyldige topics: ${ALL_TOPICS.join(', ')}`,
        },
      });
    }

    const event: IntegrationEvent = {
      eventId: randomUUID(),
      eventType: topic,
      source: source as DataSource,
      occurredAt: new Date().toISOString(),
      payload,
    };

    await eventBus.publish(event);

    res.status(202).json({ published: true, eventId: event.eventId, topic, occurredAt: event.occurredAt });
  });

  // GET /events/topics — alle gyldige topic-navn
  router.get('/topics', (_req: Request, res: Response) => {
    res.json({ count: ALL_TOPICS.length, topics: ALL_TOPICS });
  });

  // GET /events/log?topic=sale.created — siste hendelser (kun dev)
  router.get('/log', (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: { code: 'IKKE_TILGJENGELIG', message: 'Event-logg er kun tilgjengelig i dev' } });
    }
    const topicFilter = req.query.topic as string | undefined;
    const events = eventBus.getLog(topicFilter);
    res.json({ count: events.length, topic: topicFilter ?? 'alle', events });
  });

  return router;
}
