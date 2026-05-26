// ── CRUD mot cases.saker ──
import { randomUUID } from 'crypto';
import { getPool, useMemoryStore } from './pool';
import { mapSakRow } from './mappers';
import { Case, CaseListFilters, CreateCaseInput, SakStatus } from '../types';
import * as memory from './memoryStore';

const SAK_SELECT = `
  SELECT s.sak_id, s.saksnummer, s.type_kode, t.navn AS type_navn, s.status, s.prioritet,
         s.tittel, s.beskrivelse, s.kunde_id, s.kunde_navn, s.kunde_epost, s.kunde_telefon,
         s.bestiller_id, s.tildelt_gruppe, s.tildelt_bruker_id, s.opprettet_av,
         s.opprettet, s.sist_oppdatert, s.sla_frist, s.sla_brudd, s.sla_advarsel_sendt,
         s.lukket, s.løst, s.gjenåpnet, s.gjenåpnings_grunn, s.kilde, s.kilde_ref,
         s.ekstern_cs_id, s.metadata
  FROM cases.saker s
  JOIN cases.typeregister t ON t.type_kode = s.type_kode
`;

async function nextSaksnummer(): Promise<string> {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT 'CS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('cases.saksnummer_seq')::text, 5, '0') AS nr
  `);
  return rows[0].nr as string;
}

export async function createCaseRow(input: CreateCaseInput & {
  tildeltGruppe?: string;
  status: SakStatus;
  slaFrist?: string | null;
}): Promise<Case> {
  if (useMemoryStore()) {
    return memory.memoryInsertCase({
      ...input,
      tildeltGruppe: input.tildeltGruppe,
      status: input.status,
      slaFrist: input.slaFrist ?? undefined,
    });
  }

  const pool = getPool();
  const sakId = randomUUID();
  const saksnummer = await nextSaksnummer();
  const now = new Date().toISOString();

  await pool.query(`
    INSERT INTO cases.saker (
      sak_id, saksnummer, type_kode, status, prioritet, tittel, beskrivelse,
      kunde_id, kunde_navn, kunde_epost, kunde_telefon, bestiller_id,
      tildelt_gruppe, opprettet_av, sla_frist, kilde, kilde_ref, metadata,
      opprettet, sist_oppdatert
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $19
    )
  `, [
    sakId,
    saksnummer,
    input.typeKode,
    input.status,
    input.prioritet ?? 'normal',
    input.tittel,
    input.beskrivelse ?? null,
    input.kundeId ?? null,
    input.kundeNavn ?? null,
    input.kundeEpost ?? null,
    input.kundeTelefon ?? null,
    input.bestillerId ?? null,
    input.tildeltGruppe ?? null,
    input.opprettetAv ?? null,
    input.slaFrist ?? null,
    input.kilde ?? 'manual',
    input.kildeRef ?? null,
    JSON.stringify(input.metadata ?? {}),
    now,
  ]);

  const created = await getCaseById(sakId);
  if (!created) throw new Error('Failed to create case');
  return created;
}

export async function getCaseById(idOrSaksnummer: string): Promise<Case | null> {
  if (useMemoryStore()) return memory.memoryFindCase(idOrSaksnummer);

  const pool = getPool();
  const isUuid = /^[0-9a-f]{8}-/i.test(idOrSaksnummer);
  const { rows } = await pool.query(
    `${SAK_SELECT} WHERE s.${isUuid ? 'sak_id' : 'saksnummer'} = $1`,
    [idOrSaksnummer],
  );
  return rows.length ? mapSakRow(rows[0]) : null;
}

export async function listCases(filters: CaseListFilters = {}): Promise<{ cases: Case[]; total: number }> {
  if (useMemoryStore()) {
    const cases = memory.memoryListCases(filters);
    return { cases, total: cases.length };
  }

  const pool = getPool();
  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.status) {
    conditions.push(`s.status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.gruppe) {
    conditions.push(`s.tildelt_gruppe = $${idx++}`);
    params.push(filters.gruppe);
  }
  if (filters.typeKode) {
    conditions.push(`s.type_kode = $${idx++}`);
    params.push(filters.typeKode);
  }
  if (filters.tildeltBrukerId) {
    conditions.push(`s.tildelt_bruker_id = $${idx++}`);
    params.push(filters.tildeltBrukerId);
  }
  if (filters.q) {
    conditions.push(`(s.tittel ILIKE $${idx} OR s.saksnummer ILIKE $${idx} OR s.kunde_navn ILIKE $${idx})`);
    params.push(`%${filters.q}%`);
    idx++;
  }

  const where = conditions.join(' AND ');
  const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM cases.saker s WHERE ${where}`, params);
  const total = countRes.rows[0].total as number;

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const { rows } = await pool.query(
    `${SAK_SELECT} WHERE ${where} ORDER BY s.opprettet DESC LIMIT $${idx++} OFFSET $${idx}`,
    params,
  );

  return { cases: rows.map(mapSakRow), total };
}

export async function updateCaseRow(id: string, patch: Partial<Case>): Promise<Case | null> {
  if (useMemoryStore()) return memory.memoryUpdateCase(id, patch);

  const existing = await getCaseById(id);
  if (!existing) return null;

  const pool = getPool();
  await pool.query(`
    UPDATE cases.saker SET
      status = COALESCE($2, status),
      prioritet = COALESCE($3, prioritet),
      tittel = COALESCE($4, tittel),
      beskrivelse = COALESCE($5, beskrivelse),
      tildelt_gruppe = COALESCE($6, tildelt_gruppe),
      tildelt_bruker_id = COALESCE($7, tildelt_bruker_id),
      sla_frist = COALESCE($8, sla_frist),
      sla_brudd = COALESCE($9, sla_brudd),
      sla_advarsel_sendt = COALESCE($10, sla_advarsel_sendt),
      lukket = COALESCE($11, lukket),
      løst = COALESCE($12, løst),
      gjenåpnet = COALESCE($13, gjenåpnet),
      gjenåpnings_grunn = COALESCE($14, gjenåpnings_grunn),
      ekstern_cs_id = COALESCE($15, ekstern_cs_id),
      metadata = COALESCE($16, metadata),
      sist_oppdatert = now()
    WHERE sak_id = $1
  `, [
    existing.id,
    patch.status ?? null,
    patch.prioritet ?? null,
    patch.tittel ?? null,
    patch.beskrivelse ?? null,
    patch.tildeltGruppe ?? null,
    patch.tildeltBrukerId ?? null,
    patch.slaFrist ?? null,
    patch.slaBrudd ?? null,
    patch.slaAdvarselSendt ?? null,
    patch.lukket ?? null,
    patch.løst ?? null,
    patch.gjenåpnet ?? null,
    patch.gjenåpningsGrunn ?? null,
    patch.eksternCsId ?? null,
    patch.metadata ? JSON.stringify(patch.metadata) : null,
  ]);

  return getCaseById(existing.id);
}

export async function listOpenCasesForSlaCheck(): Promise<Case[]> {
  if (useMemoryStore()) return memory.memoryCasesNeedingSlaCheck();

  const pool = getPool();
  const { rows } = await pool.query(`
    ${SAK_SELECT}
    WHERE s.sla_frist IS NOT NULL
      AND s.status NOT IN ('LUKKET', 'LØST')
      AND (
        s.sla_frist <= now()
        OR (s.sla_advarsel_sendt = FALSE AND s.sla_frist <= now() + interval '1 hour')
      )
  `);
  return rows.map(mapSakRow);
}

export async function findCaseByKildeRef(kildeRef: string): Promise<Case | null> {
  if (useMemoryStore()) {
    const seen = new Set<string>();
    for (const c of memory.memoryListCases({ limit: 1000 })) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      if (c.kildeRef === kildeRef) return c;
    }
    return null;
  }

  const pool = getPool();
  const { rows } = await pool.query(`${SAK_SELECT} WHERE s.kilde_ref = $1 LIMIT 1`, [kildeRef]);
  return rows.length ? mapSakRow(rows[0]) : null;
}
