import { useEffect } from 'react';
import { toast } from '@/components/ui/sonner';
import { SALES_CORE_BASE_URL } from '@/lib/salesCore';

interface SseNotification {
  type: 'offer.viewed' | 'offer.accepted' | 'offer.declined';
  offerId: string;
  accountName: string;
  contactName: string;
  timestamp: string;
  message: string;
}

/**
 * Kobler til Sales Core SSE-strøm og viser Sonner-toast for hvert varsel.
 *
 * - offer.viewed  → info-toast (blå)
 * - offer.accepted → success-toast (grønn)
 * - offer.declined → error-toast (rød)
 *
 * Kobles opp én gang per app-session. EventSource lukkes automatisk
 * ved komponent-unmount (vanligvis aldri siden den lever i OfferHub).
 */
export function useSalesCoreSSE() {
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      try {
        es = new EventSource(`${SALES_CORE_BASE_URL}/notifications/stream`);

        es.onmessage = (event: MessageEvent) => {
          try {
            const notification = JSON.parse(event.data as string) as SseNotification;
            switch (notification.type) {
              case 'offer.viewed':
                toast.info(notification.message, {
                  description: `${notification.accountName} · ${new Date(notification.timestamp).toLocaleTimeString('nb-NO')}`,
                  duration: 6000,
                });
                break;
              case 'offer.accepted':
                toast.success(notification.message, {
                  description: `${notification.accountName} · ${new Date(notification.timestamp).toLocaleTimeString('nb-NO')}`,
                  duration: 8000,
                });
                break;
              case 'offer.declined':
                toast.error(notification.message, {
                  description: `${notification.accountName} · ${new Date(notification.timestamp).toLocaleTimeString('nb-NO')}`,
                  duration: 8000,
                });
                break;
            }
          } catch {
            // Ignorer heartbeat-meldinger og uforventet JSON
          }
        };

        es.onerror = () => {
          es?.close();
          es = null;
          // Prøv å koble til igjen etter 10 sek
          reconnectTimer = setTimeout(connect, 10_000);
        };
      } catch {
        // EventSource støttes ikke eller Sales Core er nede — prøv igjen
        reconnectTimer = setTimeout(connect, 10_000);
      }
    }

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, []);
}
