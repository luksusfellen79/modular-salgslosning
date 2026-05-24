// ── Abonner på Integration Layer EventBus via SSE ──
import http from 'http';
import https from 'https';
import logger from '../logger';

export interface IntegrationLayerEvent {
  eventId: string;
  eventType: string;
  source: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

type EventHandler = (event: IntegrationLayerEvent) => void;

export class IntegrationLayerSubscriber {
  private handlers = new Set<EventHandler>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private stopped = false;

  constructor(private baseUrl: string) {}

  onEvent(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 5000);
  }

  private connect(): void {
    const url = new URL('/events/stream', this.baseUrl);
    const transport = url.protocol === 'https:' ? https : http;

    const req = transport.get(url, (res) => {
      if (res.statusCode !== 200) {
        logger.warn('integration_layer_stream_failed', { status: res.statusCode, url: url.toString() });
        this.scheduleReconnect();
        return;
      }

      logger.info('integration_layer_stream_connected', { url: url.toString() });
      let buffer = '';

      res.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const event = this.parseSseBlock(part);
          if (event) this.dispatch(event);
        }
      });

      res.on('end', () => {
        logger.warn('integration_layer_stream_ended');
        this.scheduleReconnect();
      });

      res.on('error', (err: Error) => {
        logger.error('integration_layer_stream_error', { error: err.message });
        this.scheduleReconnect();
      });
    });

    req.on('error', (err: Error) => {
      logger.error('integration_layer_stream_request_error', { error: err.message });
      this.scheduleReconnect();
    });
  }

  private parseSseBlock(block: string): IntegrationLayerEvent | null {
    const lines = block.split('\n');
    let eventType = 'message';
    let dataLine = '';

    for (const line of lines) {
      if (line.startsWith('event:')) eventType = line.slice(6).trim();
      if (line.startsWith('data:')) dataLine = line.slice(5).trim();
    }

    if (!dataLine) return null;

    try {
      const parsed = JSON.parse(dataLine) as IntegrationLayerEvent;
      return { ...parsed, eventType: parsed.eventType ?? eventType };
    } catch {
      return null;
    }
  }

  private dispatch(event: IntegrationLayerEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (err) {
        logger.error('integration_layer_event_handler_error', {
          eventType: event.eventType,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}
