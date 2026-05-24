// ── SDU runder og besøk (PostgreSQL) ──
import { randomUUID } from 'crypto';
import { getPool } from './pool';
import {
  legacyRndId,
  roundStatusFromDb,
  roundStatusToDb,
  SEED_USER_IDS,
  visitStatusFromDb,
  visitStatusToDb,
} from './mappers';
import { Round, RoundUnit, Seller } from '../types';

interface RundeRow {
  runde_id: string;
  navn: string;
  bygg_id: string;
  selger_id: string;
  selger_navn: string;
  leder_id: string;
  leder_navn: string | null;
  dato: Date | string;
  status: string;
  opprettet: Date | string;
}

interface BesokRow {
  besok_id: string;
  runde_id: string;
  leilighet_id: string;
  utfall: string;
  notater: string | null;
  tidspunkt: Date | string | null;
}

async function resolveBrukerIdByName(name: string): Promise<string> {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT bruker_id FROM hub.brukere WHERE LOWER(navn) = LOWER($1) LIMIT 1
  `, [name.trim()]);
  return rows[0]?.bruker_id ?? SEED_USER_IDS.per;
}

async function resolveBrukerIdByIdOrName(idOrName: string): Promise<string> {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrName)) {
    return idOrName;
  }
  return resolveBrukerIdByName(idOrName);
}

function assembleRound(runde: RundeRow, besok: BesokRow[]): Round {
  const units: RoundUnit[] = besok.map((b) => ({
    unitId: b.leilighet_id,
    buildingId: runde.bygg_id,
    address: b.leilighet_id,
    visitStatus: visitStatusFromDb(b.utfall),
    note: b.notater ?? undefined,
    visitedAt: b.tidspunkt ? new Date(b.tidspunkt).toISOString() : undefined,
  }));

  return {
    id: runde.runde_id,
    name: runde.navn,
    date: new Date(runde.dato).toISOString().slice(0, 10),
    status: roundStatusFromDb(runde.status),
    seller: { id: runde.selger_id, name: runde.selger_navn },
    createdBy: runde.leder_navn ?? runde.leder_id,
    units,
    createdAt: new Date(runde.opprettet).toISOString(),
    updatedAt: new Date(runde.opprettet).toISOString(),
  };
}

async function fetchBesokForRunder(rundeIds: string[]): Promise<Map<string, BesokRow[]>> {
  const map = new Map<string, BesokRow[]>();
  if (!rundeIds.length) return map;

  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT besok_id, runde_id, leilighet_id, utfall, notater, tidspunkt
    FROM sales_core.sdu_besøk
    WHERE runde_id = ANY($1::uuid[])
    ORDER BY leilighet_id
  `, [rundeIds]);

  for (const row of rows as BesokRow[]) {
    const list = map.get(row.runde_id) ?? [];
    list.push(row);
    map.set(row.runde_id, list);
  }
  return map;
}

const RUNDE_SELECT = `
  SELECT r.runde_id, r.navn, r.bygg_id, r.selger_id, selger.navn AS selger_navn,
         r.leder_id, leder.navn AS leder_navn, r.dato, r.status, r.opprettet
  FROM sales_core.sdu_runder r
  JOIN hub.brukere selger ON selger.bruker_id = r.selger_id
  LEFT JOIN hub.brukere leder ON leder.bruker_id = r.leder_id
`;

export async function listSduRounds(): Promise<Round[]> {
  const pool = getPool();
  const { rows } = await pool.query(`${RUNDE_SELECT} ORDER BY r.dato DESC, r.opprettet DESC`);
  const runder = rows as RundeRow[];
  const besokMap = await fetchBesokForRunder(runder.map((r: RundeRow) => r.runde_id));
  return runder.map((r: RundeRow) => assembleRound(r, besokMap.get(r.runde_id) ?? []));
}

export async function getSduRoundById(id: string): Promise<Round | null> {
  const pool = getPool();
  const rundeId = legacyRndId(id);
  const { rows } = await pool.query(`${RUNDE_SELECT} WHERE r.runde_id = $1`, [rundeId]);
  if (!rows.length) return null;
  const besokMap = await fetchBesokForRunder([rundeId]);
  return assembleRound(rows[0] as RundeRow, besokMap.get(rundeId) ?? []);
}

export async function createSduRound(round: Round): Promise<Round> {
  const pool = getPool();
  const rundeId = round.id ? legacyRndId(round.id) : randomUUID();
  const byggId = round.units[0]?.buildingId ?? 'unknown-building';
  const selgerId = await resolveBrukerIdByIdOrName(round.seller.id);
  const lederId = await resolveBrukerIdByName(round.createdBy);

  await ensureSduSellerForBruker(selgerId);

  await pool.query(`
    INSERT INTO sales_core.sdu_runder (runde_id, navn, bygg_id, selger_id, leder_id, dato, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [rundeId, round.name, byggId, selgerId, lederId, round.date, roundStatusToDb(round.status)]);

  for (const unit of round.units) {
    await pool.query(`
      INSERT INTO sales_core.sdu_besøk (runde_id, leilighet_id, utfall, notater, tidspunkt)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      rundeId,
      unit.unitId,
      visitStatusToDb(unit.visitStatus),
      unit.note ?? null,
      unit.visitedAt ?? null,
    ]);
  }

  const created = await getSduRoundById(rundeId);
  if (!created) throw new Error('Failed to create SDU round');
  return created;
}

export async function updateSduRound(id: string, patch: Partial<Round>): Promise<Round | null> {
  const existing = await getSduRoundById(id);
  if (!existing) return null;

  const merged: Round = {
    ...existing,
    ...patch,
    id: existing.id,
    seller: patch.seller ?? existing.seller,
    units: patch.units ?? existing.units,
    updatedAt: new Date().toISOString(),
  };

  const pool = getPool();
  const rundeId = legacyRndId(id);
  const byggId = merged.units[0]?.buildingId ?? 'unknown-building';
  const selgerId = await resolveBrukerIdByIdOrName(merged.seller.id);
  const lederId = await resolveBrukerIdByName(merged.createdBy);

  await ensureSduSellerForBruker(selgerId);

  await pool.query(`
    UPDATE sales_core.sdu_runder SET
      navn = $2, bygg_id = $3, selger_id = $4, leder_id = $5, dato = $6, status = $7
    WHERE runde_id = $1
  `, [rundeId, merged.name, byggId, selgerId, lederId, merged.date, roundStatusToDb(merged.status)]);

  await pool.query('DELETE FROM sales_core.sdu_besøk WHERE runde_id = $1', [rundeId]);
  for (const unit of merged.units) {
    await pool.query(`
      INSERT INTO sales_core.sdu_besøk (runde_id, leilighet_id, utfall, notater, tidspunkt)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      rundeId,
      unit.unitId,
      visitStatusToDb(unit.visitStatus),
      unit.note ?? null,
      unit.visitedAt ?? null,
    ]);
  }

  return getSduRoundById(id);
}

export async function updateSduRoundUnit(
  roundId: string,
  unitId: string,
  patch: Partial<RoundUnit>,
): Promise<Round | null> {
  const existing = await getSduRoundById(roundId);
  if (!existing) return null;

  const unitIndex = existing.units.findIndex((u) => u.unitId === unitId);
  let units: RoundUnit[];
  if (unitIndex === -1) {
    units = [
      ...existing.units,
      {
        unitId,
        buildingId: existing.units[0]?.buildingId ?? 'unknown-building',
        address: unitId,
        visitStatus: patch.visitStatus ?? 'pending',
        note: patch.note,
        visitedAt: patch.visitedAt,
      },
    ];
  } else {
    const updatedUnit: RoundUnit = {
      ...existing.units[unitIndex],
      ...patch,
      visitedAt: patch.visitStatus && patch.visitStatus !== 'pending'
        ? (patch.visitedAt ?? new Date().toISOString())
        : existing.units[unitIndex].visitedAt,
    };
    units = [...existing.units];
    units[unitIndex] = updatedUnit;
  }

  return updateSduRound(roundId, { units, updatedAt: new Date().toISOString() });
}

export async function listSduSellers(): Promise<Seller[]> {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT s.selger_id, b.navn, b.epost, s.aktiv, s.opprettet
    FROM sales_core.sdu_selgere s
    JOIN hub.brukere b ON b.bruker_id = s.selger_id
    ORDER BY b.navn
  `);
  return rows.map((row: {
    selger_id: string;
    navn: string;
    epost: string | null;
    aktiv: boolean;
    opprettet: Date | string;
  }) => ({
    id: row.selger_id,
    name: row.navn,
    email: row.epost ?? '',
    role: 'seller' as const,
    isActive: row.aktiv,
    createdAt: new Date(row.opprettet).toISOString(),
  }));
}

export async function createSduSeller(seller: Seller): Promise<Seller> {
  const pool = getPool();
  await pool.query(`
    INSERT INTO sales_core.sdu_selgere (selger_id) VALUES ($1)
    ON CONFLICT (selger_id) DO NOTHING
  `, [seller.id]);
  return seller;
}

export async function ensureSduSellerForBruker(brukerId: string): Promise<void> {
  const pool = getPool();
  await pool.query(`
    INSERT INTO sales_core.sdu_selgere (selger_id) VALUES ($1)
    ON CONFLICT (selger_id) DO NOTHING
  `, [brukerId]);
}

export async function countSduRounds(): Promise<number> {
  const pool = getPool();
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM sales_core.sdu_runder');
  return rows[0].count as number;
}
