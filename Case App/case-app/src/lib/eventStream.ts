import { useEffect } from 'react';
import { CaseAlert } from './types';

const IL_URL =
  (import.meta.env.VITE_INTEGRATION_LAYER_URL as string | undefined)
  ?? 'https://integration-layer-production.up.railway.app';

const CASE_EVENT_TYPES = new Set([
  'case.created',
  'case.status_changed',
  'case.escalated',
  'case.assigned',
  'case.sla_warning',
  'case.sla_breached',
]);

function alertMessage(type: string, payload: Record<string, unknown>): string {
  const nr = payload.saksnummer as string | undefined;
  const prefix = nr ? `${nr}: ` : '';
  switch (type) {
    case 'case.created':
      return `${prefix}Ny sak opprettet`;
    case 'case.sla_warning':
      return `${prefix}SLA nærmer seg frist`;
    case 'case.sla_breached':
      return `${prefix}SLA brutt`;
    case 'case.escalated':
      return `${prefix}Sak eskalert`;
    case 'case.assigned':
      return `${prefix}Sak tildelt`;
    case 'case.status_changed':
      return `${prefix}Status endret`;
    default:
      return `${prefix}${type}`;
  }
}

export function useCaseEventStream(onAlert: (alert: CaseAlert) => void): void {
  useEffect(() => {
    let es: EventSource | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      es = new EventSource(`${IL_URL}/events/stream`);

      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as { eventType?: string; payload?: Record<string, unknown> };
          const type = data.eventType ?? 'unknown';
          if (!CASE_EVENT_TYPES.has(type)) return;
          const payload = data.payload ?? {};
          onAlert({
            id: `${type}-${Date.now()}`,
            type,
            message: alertMessage(type, payload),
            caseId: payload.caseId as string | undefined,
            saksnummer: payload.saksnummer as string | undefined,
            at: new Date().toISOString(),
          });
        } catch {
          /* ignore malformed */
        }
      };

      for (const type of CASE_EVENT_TYPES) {
        es.addEventListener(type, (ev) => {
          try {
            const data = JSON.parse((ev as MessageEvent).data) as {
              eventType?: string;
              payload?: Record<string, unknown>;
            };
            const payload = data.payload ?? {};
            onAlert({
              id: `${type}-${Date.now()}`,
              type,
              message: alertMessage(type, payload),
              caseId: payload.caseId as string | undefined,
              saksnummer: payload.saksnummer as string | undefined,
              at: new Date().toISOString(),
            });
          } catch {
            /* ignore */
          }
        });
      }

      es.onerror = () => {
        es?.close();
        window.setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      closed = true;
      es?.close();
    };
  }, [onAlert]);
}
