// ── SLA-beregning og overvåking ──
import { getCaseType } from '../db/typeRepository';
import { listOpenCasesForSlaCheck, updateCaseRow } from '../db/caseRepository';
import { logCaseEvent } from '../db/eventRepository';
import { emitIntegrationEvent } from '../events/integrationLayerPublisher';
import { EventTopics } from '../events/topics';
import { logger } from '../logger';
import { Case } from '../types';

export function calculateSlaDeadline(
  opprettet: Date,
  slaTimer: number | null,
  slaAktiv: boolean,
): string | null {
  if (!slaAktiv || !slaTimer || slaTimer <= 0) return null;
  const deadline = new Date(opprettet.getTime() + slaTimer * 60 * 60 * 1000);
  return deadline.toISOString();
}

export async function computeSlaForType(typeKode: string, opprettet = new Date()): Promise<string | null> {
  const type = await getCaseType(typeKode);
  if (!type) return null;
  return calculateSlaDeadline(opprettet, type.slaTimer, type.slaAktiv);
}

export async function runSlaCheck(): Promise<void> {
  const cases = await listOpenCasesForSlaCheck();
  const now = Date.now();

  for (const c of cases) {
    if (!c.slaFrist) continue;
    const deadline = new Date(c.slaFrist).getTime();
    const oneHourMs = 60 * 60 * 1000;

    if (!c.slaAdvarselSendt && deadline - now <= oneHourMs && deadline > now) {
      await handleSlaWarning(c);
    } else if (deadline <= now && !c.slaBrudd) {
      await handleSlaBreach(c);
    }
  }
}

async function handleSlaWarning(c: Case): Promise<void> {
  await updateCaseRow(c.id, { slaAdvarselSendt: true });
  await logCaseEvent({
    sakId: c.id,
    hendelseType: 'sla_warning',
    kommentar: `SLA utløper ${c.slaFrist}`,
    metadata: { slaFrist: c.slaFrist },
  });
  emitIntegrationEvent(EventTopics.CASE_SLA_WARNING, {
    caseId: c.id,
    saksnummer: c.saksnummer,
    slaFrist: c.slaFrist,
    typeKode: c.typeKode,
  });
  logger.info({ message: 'SLA warning', caseId: c.id, saksnummer: c.saksnummer });
}

async function handleSlaBreach(c: Case): Promise<void> {
  await updateCaseRow(c.id, { slaBrudd: true });
  await logCaseEvent({
    sakId: c.id,
    hendelseType: 'sla_breached',
    kommentar: `SLA brutt — frist var ${c.slaFrist}`,
    metadata: { slaFrist: c.slaFrist },
  });
  emitIntegrationEvent(EventTopics.CASE_SLA_BREACHED, {
    caseId: c.id,
    saksnummer: c.saksnummer,
    slaFrist: c.slaFrist,
    typeKode: c.typeKode,
  });
  logger.warn({ message: 'SLA breached', caseId: c.id, saksnummer: c.saksnummer });
}

export function startSlaMonitor(): NodeJS.Timeout {
  const intervalMs = parseInt(process.env.SLA_CHECK_INTERVAL_MS ?? '60000', 10);
  return setInterval(() => {
    void runSlaCheck().catch((err) => {
      logger.error({ message: 'SLA check failed', error: err instanceof Error ? err.message : String(err) });
    });
  }, intervalMs);
}
