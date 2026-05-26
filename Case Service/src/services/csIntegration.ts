// ── Integrasjon mot eksternt kundeservicesystem ──
import { logCaseEvent } from '../db/eventRepository';
import { updateCaseRow } from '../db/caseRepository';
import { logger } from '../logger';
import { Case, CaseEvent } from '../types';
import { sendEmail } from './emailService';

const CS_API_URL = process.env.CS_API_URL ?? '';
const CS_API_TOKEN = process.env.CS_API_TOKEN ?? '';

export async function syncCaseToCs(caseItem: Case, event?: CaseEvent): Promise<void> {
  if (!CS_API_URL) {
    logger.info({ message: 'CS sync skipped (CS_API_URL not set)', caseId: caseItem.id });
    return;
  }

  try {
    const res = await fetch(`${CS_API_URL.replace(/\/$/, '')}/cases`, {
      method: caseItem.eksternCsId ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CS_API_TOKEN}`,
      },
      body: JSON.stringify({
        externalId: caseItem.id,
        csId: caseItem.eksternCsId,
        saksnummer: caseItem.saksnummer,
        status: caseItem.status,
        typeKode: caseItem.typeKode,
        tittel: caseItem.tittel,
        beskrivelse: caseItem.beskrivelse,
        kundeNavn: caseItem.kundeNavn,
        tildeltGruppe: caseItem.tildeltGruppe,
        event: event ? {
          type: event.hendelseType,
          kommentar: event.kommentar,
          tidspunkt: event.tidspunkt,
        } : undefined,
      }),
    });

    if (!res.ok) {
      logger.warn({ message: 'CS API sync failed', status: res.status, caseId: caseItem.id });
      return;
    }

    const data = await res.json() as { csId?: string };
    if (data.csId && !caseItem.eksternCsId) {
      await updateCaseRow(caseItem.id, { eksternCsId: data.csId });
    }
  } catch (err) {
    logger.warn({
      message: 'CS API sync error',
      caseId: caseItem.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** CS varsles ved alle statusendringer (e-post fallback når CS_API_URL ikke er satt) */
export async function notifyCsOnStatusChange(caseItem: Case, event: CaseEvent): Promise<void> {
  await syncCaseToCs(caseItem, event);

  const csEmail = process.env.CS_NOTIFY_EMAIL;
  if (csEmail) {
    await sendEmail({
      to: csEmail,
      subject: `[Case ${caseItem.saksnummer}] ${event.tilStatus ?? event.hendelseType}`,
      body: [
        `Sak: ${caseItem.saksnummer} — ${caseItem.tittel}`,
        `Status: ${caseItem.status}`,
        `Type: ${caseItem.typeKode}`,
        event.kommentar ? `Kommentar: ${event.kommentar}` : '',
      ].filter(Boolean).join('\n'),
    });
  }
}
