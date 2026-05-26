// ── Ruting: casetype → teknisk gruppe ──
import { getRoutingRule } from '../db/typeRepository';
import { logger } from '../logger';

export interface RoutingResult {
  malgruppe: string;
  autoTildel: boolean;
}

export async function resolveRouting(typeKode: string): Promise<RoutingResult> {
  const rule = await getRoutingRule(typeKode);
  if (!rule) {
    logger.warn({ message: 'No routing rule found, defaulting to kundeservice', typeKode });
    return { malgruppe: 'kundeservice', autoTildel: true };
  }
  return { malgruppe: rule.malgruppe, autoTildel: rule.autoTildel };
}

/** Map EventBus failure-topics til casetype */
export const FAILURE_TOPIC_TO_CASE_TYPE: Record<string, string> = {
  'order.failed': 'ORDER_FEIL',
  'activation.failed': 'AKTIVERING_FEIL',
  'fiber.failed': 'FIBER_FEIL',
  'mobile.failed': 'MOBILFEIL',
  'invoice.failed': 'FAKTURA_FEIL',
  'tv.failed': 'TV_FEIL',
  'verdikjede.failed': 'ORDER_FEIL',
};

export function inferCaseTypeFromEvent(eventType: string, payload: Record<string, unknown>): string | null {
  if (typeof payload.caseType === 'string') return payload.caseType;
  if (typeof payload.typeKode === 'string') return payload.typeKode;
  if (FAILURE_TOPIC_TO_CASE_TYPE[eventType]) return FAILURE_TOPIC_TO_CASE_TYPE[eventType];

  const errorDomain = String(payload.errorDomain ?? payload.domain ?? '').toLowerCase();
  if (errorDomain.includes('fiber')) return 'FIBER_FEIL';
  if (errorDomain.includes('mobil')) return 'MOBILFEIL';
  if (errorDomain.includes('faktura') || errorDomain.includes('invoice')) return 'FAKTURA_FEIL';
  if (errorDomain.includes('tv')) return 'TV_FEIL';
  if (errorDomain.includes('order') || errorDomain.includes('ordre')) return 'ORDER_FEIL';
  if (errorDomain.includes('aktiver')) return 'AKTIVERING_FEIL';

  if (payload.autoCreateCase === true && payload.severity === 'error') {
    return 'ORDER_FEIL';
  }

  return null;
}
