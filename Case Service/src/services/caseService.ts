// ── Case business logic ──
import { createCaseRow, getCaseById, updateCaseRow, findCaseByKildeRef } from '../db/caseRepository';
import { logCaseEvent } from '../db/eventRepository';
import { getCaseType } from '../db/typeRepository';
import { emitIntegrationEvent } from '../events/integrationLayerPublisher';
import { EventTopics } from '../events/topics';
import { notifyCsOnStatusChange, syncCaseToCs } from './csIntegration';
import { resolveRouting, inferCaseTypeFromEvent } from './routingService';
import { computeSlaForType } from './slaService';
import { Actor, Case, CreateCaseInput, SakStatus } from '../types';

async function transitionStatus(
  caseItem: Case,
  newStatus: SakStatus,
  actor: Actor,
  kommentar?: string,
  extra?: Partial<Case>,
): Promise<Case> {
  const updated = await updateCaseRow(caseItem.id, {
    status: newStatus,
    ...extra,
  });
  if (!updated) throw new Error('Case not found');

  const event = await logCaseEvent({
    sakId: caseItem.id,
    hendelseType: 'status_changed',
    fraStatus: caseItem.status,
    tilStatus: newStatus,
    utførtAv: actor.brukerId,
    utførtAvNavn: actor.brukerNavn,
    kommentar,
  });

  emitIntegrationEvent(EventTopics.CASE_STATUS_CHANGED, {
    caseId: updated.id,
    saksnummer: updated.saksnummer,
    fromStatus: caseItem.status,
    toStatus: newStatus,
    typeKode: updated.typeKode,
  });

  await notifyCsOnStatusChange(updated, event);
  return updated;
}

export async function createCase(input: CreateCaseInput): Promise<Case> {
  const caseType = await getCaseType(input.typeKode);
  if (!caseType) throw new Error(`Ukjent casetype: ${input.typeKode}`);

  if (input.kildeRef) {
    const existing = await findCaseByKildeRef(input.kildeRef);
    if (existing) return existing;
  }

  const routing = await resolveRouting(input.typeKode);
  const slaFrist = await computeSlaForType(input.typeKode);
  const initialStatus: SakStatus = routing.autoTildel ? 'TILDELT' : 'OPPRETTET';

  const created = await createCaseRow({
    ...input,
    tildeltGruppe: routing.malgruppe,
    status: initialStatus,
    slaFrist,
  });

  await logCaseEvent({
    sakId: created.id,
    hendelseType: 'created',
    tilStatus: initialStatus,
    tilGruppe: routing.malgruppe,
    utførtAv: input.opprettetAv,
    utførtAvNavn: input.opprettetAvNavn,
    kommentar: input.beskrivelse,
    metadata: { kilde: input.kilde, kildeRef: input.kildeRef },
  });

  if (routing.autoTildel) {
    await logCaseEvent({
      sakId: created.id,
      hendelseType: 'assigned',
      tilGruppe: routing.malgruppe,
      kommentar: 'Automatisk ruting',
    });
    emitIntegrationEvent(EventTopics.CASE_ASSIGNED, {
      caseId: created.id,
      saksnummer: created.saksnummer,
      gruppe: routing.malgruppe,
    });
  }

  emitIntegrationEvent(EventTopics.CASE_CREATED, {
    caseId: created.id,
    saksnummer: created.saksnummer,
    typeKode: created.typeKode,
    status: created.status,
    tildeltGruppe: created.tildeltGruppe,
    kilde: created.kilde,
  });

  await syncCaseToCs(created);
  return (await getCaseById(created.id))!;
}

export async function assignCase(
  id: string,
  input: { gruppe?: string; brukerId?: string; brukerNavn?: string },
  actor: Actor,
): Promise<Case> {
  const existing = await getCaseById(id);
  if (!existing) throw new Error('Case not found');

  const updated = await updateCaseRow(id, {
    tildeltGruppe: input.gruppe ?? existing.tildeltGruppe,
    tildeltBrukerId: input.brukerId,
    status: existing.status === 'OPPRETTET' ? 'TILDELT' : existing.status,
  });
  if (!updated) throw new Error('Case not found');

  await logCaseEvent({
    sakId: id,
    hendelseType: 'assigned',
    fraGruppe: existing.tildeltGruppe,
    tilGruppe: updated.tildeltGruppe,
    utførtAv: actor.brukerId ?? input.brukerId,
    utførtAvNavn: actor.brukerNavn ?? input.brukerNavn,
    kommentar: input.brukerId ? `Tildelt ${input.brukerNavn ?? input.brukerId}` : `Rutet til ${input.gruppe}`,
  });

  emitIntegrationEvent(EventTopics.CASE_ASSIGNED, {
    caseId: updated.id,
    saksnummer: updated.saksnummer,
    gruppe: updated.tildeltGruppe,
    brukerId: updated.tildeltBrukerId,
  });

  return updated;
}

export async function takeCase(id: string, actor: Actor): Promise<Case> {
  if (!actor.brukerId) throw new Error('brukerId required');
  return assignCase(id, { brukerId: actor.brukerId, brukerNavn: actor.brukerNavn }, actor);
}

export async function startCase(id: string, actor: Actor): Promise<Case> {
  const existing = await getCaseById(id);
  if (!existing) throw new Error('Case not found');
  return transitionStatus(existing, 'UNDER_ARBEID', actor, 'Arbeid startet');
}

export async function resolveCase(id: string, actor: Actor, kommentar?: string): Promise<Case> {
  const existing = await getCaseById(id);
  if (!existing) throw new Error('Case not found');

  const updated = await transitionStatus(existing, 'LØST', actor, kommentar, {
    løst: new Date().toISOString(),
  });

  await logCaseEvent({
    sakId: id,
    hendelseType: 'resolved',
    tilStatus: 'LØST',
    utførtAv: actor.brukerId,
    utførtAvNavn: actor.brukerNavn,
    kommentar,
  });

  return updated;
}

export async function closeCase(id: string, actor: Actor, kommentar?: string): Promise<Case> {
  const existing = await getCaseById(id);
  if (!existing) throw new Error('Case not found');

  const updated = await transitionStatus(existing, 'LUKKET', actor, kommentar, {
    lukket: new Date().toISOString(),
  });

  await logCaseEvent({
    sakId: id,
    hendelseType: 'closed',
    tilStatus: 'LUKKET',
    utførtAv: actor.brukerId,
    utførtAvNavn: actor.brukerNavn,
    kommentar,
  });

  return updated;
}

export async function reopenCase(id: string, actor: Actor, grunn: string, kommentar?: string): Promise<Case> {
  const existing = await getCaseById(id);
  if (!existing) throw new Error('Case not found');
  if (existing.status !== 'LUKKET' && existing.status !== 'LØST') {
    throw new Error('Kun lukkede saker kan gjenåpnes');
  }

  const updated = await transitionStatus(existing, 'GJENÅPNET', actor, kommentar ?? grunn, {
    gjenåpnet: new Date().toISOString(),
    gjenåpningsGrunn: grunn,
    lukket: undefined,
    løst: undefined,
  });

  await logCaseEvent({
    sakId: id,
    hendelseType: 'reopened',
    tilStatus: 'GJENÅPNET',
    utførtAv: actor.brukerId,
    utførtAvNavn: actor.brukerNavn,
    kommentar: grunn,
  });

  return assignCase(id, { gruppe: existing.tildeltGruppe }, actor);
}

export async function escalateCase(
  id: string,
  actor: Actor,
  input: { kommentar?: string; malgruppe?: string },
): Promise<Case> {
  const existing = await getCaseById(id);
  if (!existing) throw new Error('Case not found');

  const targetGroup = input.malgruppe ?? 'kundeservice';
  const newStatus: SakStatus = existing.status === 'ESKALERT' ? 'UNDER_ARBEID_2LINJE' : 'ESKALERT';

  const updated = await transitionStatus(existing, newStatus, actor, input.kommentar, {
    tildeltGruppe: targetGroup,
    tildeltBrukerId: undefined,
  });

  await logCaseEvent({
    sakId: id,
    hendelseType: 'escalated',
    fraGruppe: existing.tildeltGruppe,
    tilGruppe: targetGroup,
    tilStatus: newStatus,
    utførtAv: actor.brukerId,
    utførtAvNavn: actor.brukerNavn,
    kommentar: input.kommentar,
  });

  emitIntegrationEvent(EventTopics.CASE_ESCALATED, {
    caseId: updated.id,
    saksnummer: updated.saksnummer,
    malgruppe: targetGroup,
    kommentar: input.kommentar,
  });

  return updated;
}

export async function addComment(
  id: string,
  actor: Actor,
  tekst: string,
): Promise<Case> {
  const existing = await getCaseById(id);
  if (!existing) throw new Error('Case not found');

  await logCaseEvent({
    sakId: id,
    hendelseType: 'comment',
    utførtAv: actor.brukerId,
    utførtAvNavn: actor.brukerNavn,
    kommentar: tekst,
  });

  return existing;
}

export async function createCaseFromEvent(
  eventType: string,
  payload: Record<string, unknown>,
  eventId: string,
): Promise<Case | null> {
  const typeKode = inferCaseTypeFromEvent(eventType, payload);
  if (!typeKode) return null;

  const title = String(payload.title ?? payload.tittel ?? `Auto: ${typeKode} (${eventType})`);
  const description = String(payload.message ?? payload.description ?? payload.beskrivelse ?? eventType);

  return createCase({
    typeKode,
    tittel: title,
    beskrivelse: description,
    kundeId: payload.customerId as string | undefined,
    kundeNavn: payload.customerName as string | undefined ?? payload.kundeNavn as string | undefined,
    bestillerId: payload.orderId as string | undefined,
    kilde: 'eventbus',
    kildeRef: eventId,
    metadata: { sourceEvent: eventType, payload },
  });
}
