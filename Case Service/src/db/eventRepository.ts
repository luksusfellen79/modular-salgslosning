// ── Hendelseslogg (cases.hendelser) ──
import { randomUUID } from 'crypto';
import { getPool, useMemoryStore } from './pool';
import { mapHendelseRow } from './mappers';
import { CaseEvent, HendelseType, SakStatus } from '../types';
import * as memory from './memoryStore';

export interface LogEventInput {
  sakId: string;
  hendelseType: HendelseType;
  fraStatus?: SakStatus;
  tilStatus?: SakStatus;
  fraGruppe?: string;
  tilGruppe?: string;
  utførtAv?: string;
  utførtAvNavn?: string;
  kommentar?: string;
  metadata?: Record<string, unknown>;
}

export async function logCaseEvent(input: LogEventInput): Promise<CaseEvent> {
  if (useMemoryStore()) {
    return memory.memoryInsertEvent({
      sakId: input.sakId,
      hendelseType: input.hendelseType,
      fraStatus: input.fraStatus,
      tilStatus: input.tilStatus,
      fraGruppe: input.fraGruppe,
      tilGruppe: input.tilGruppe,
      utførtAv: input.utførtAv,
      utførtAvNavn: input.utførtAvNavn,
      kommentar: input.kommentar,
      metadata: input.metadata ?? {},
    });
  }

  const pool = getPool();
  const hendelseId = randomUUID();
  const { rows } = await pool.query(`
    INSERT INTO cases.hendelser (
      hendelse_id, sak_id, hendelse_type, fra_status, til_status,
      fra_gruppe, til_gruppe, utført_av, utført_av_navn, kommentar, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING hendelse_id, sak_id, hendelse_type, fra_status, til_status,
              fra_gruppe, til_gruppe, utført_av, utført_av_navn, kommentar, metadata, tidspunkt
  `, [
    hendelseId,
    input.sakId,
    input.hendelseType,
    input.fraStatus ?? null,
    input.tilStatus ?? null,
    input.fraGruppe ?? null,
    input.tilGruppe ?? null,
    input.utførtAv ?? null,
    input.utførtAvNavn ?? null,
    input.kommentar ?? null,
    JSON.stringify(input.metadata ?? {}),
  ]);
  return mapHendelseRow(rows[0]);
}

export async function listCaseEvents(sakId: string): Promise<CaseEvent[]> {
  if (useMemoryStore()) return memory.memoryListEvents(sakId);
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT hendelse_id, sak_id, hendelse_type, fra_status, til_status,
           fra_gruppe, til_gruppe, utført_av, utført_av_navn, kommentar, metadata, tidspunkt
    FROM cases.hendelser WHERE sak_id = $1 ORDER BY tidspunkt DESC
  `, [sakId]);
  return rows.map(mapHendelseRow);
}
