// ── EventBusRouter — HTTP-grensesnitt for EventBus ──
// POST /events/publish     — publiser en hendelse
// GET  /events/topics      — alle gyldige topic-navn
// GET  /events/log         — siste hendelser (kun dev)
// GET  /events/stream      — SSE-strøm for eksterne abonnenter (Workflow m.m.)

import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { InMemoryEventBus } from './InMemoryEventBus.js';
import { ALL_TOPICS } from './EventTopics.js';
import { IntegrationEvent, DataSource } from '../types/domain.js';
import { logger } from '../logger.js';

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
    if (process.env.NODE_ENV === 'production' && process.env.EVENTS_LOG_ENABLED !== 'true') {
      return res.status(403).json({ error: { code: 'IKKE_TILGJENGELIG', message: 'Event-logg er kun tilgjengelig i dev' } });
    }
    const topicFilter = req.query.topic as string | undefined;
    const events = eventBus.getLog(topicFilter);
    res.json({ count: events.length, topic: topicFilter ?? 'alle', events });
  });

  // GET /events/stream — Server-Sent Events for Workflow og andre moduler
  router.get('/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const topicFilter = typeof req.query.topic === 'string' ? req.query.topic : undefined;
    const clientId = randomUUID();

    const sendEvent = (event: IntegrationEvent): void => {
      if (topicFilter && event.eventType !== topicFilter) return;
      if (res.writableEnded) return;
      res.write(`event: ${event.eventType}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    const unsubscribe = eventBus.addStreamListener(sendEvent);
    res.write(`: connected ${clientId}\n\n`);

    const heartbeat = setInterval(() => {
      if (!res.writableEnded) res.write(': heartbeat\n\n');
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
      logger.info('Event stream client disconnected', { clientId });
    });
  });

  return router;
}
