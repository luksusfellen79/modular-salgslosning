// ── MDU deals (PostgreSQL) ──
import { getPool } from './pool';
import {
  dealRowToOpportunity,
  legacyOppId,
  opportunityToDealRow,
  SEED_USER_IDS,
} from './mappers';
import { Opportunity } from '../types';

async function defaultSelgerId(): Promise<string> {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT bruker_id FROM hub.brukere WHERE rolle_id IN ('mdu-selger', 'superadmin') AND aktiv = true LIMIT 1
  `);
  return rows[0]?.bruker_id ?? SEED_USER_IDS.lise;
}

export async function listMduDeals(): Promise<Opportunity[]> {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT deal_id, bygg_id, adresse, antall_enheter, status, verdi_kr, forventet_close,
           notater, opprettet, sist_oppdatert
    FROM sales_core.mdu_deals
    ORDER BY sist_oppdatert DESC
  `);
  return rows.map(dealRowToOpportunity);
}

export async function getMduDealById(id: string): Promise<Opportunity | null> {
  const pool = getPool();
  const dealId = legacyOppId(id);
  const { rows } = await pool.query(`
    SELECT deal_id, bygg_id, adresse, antall_enheter, status, verdi_kr, forventet_close,
           notater, opprettet, sist_oppdatert
    FROM sales_core.mdu_deals
    WHERE deal_id = $1
  `, [dealId]);
  if (!rows.length) return null;
  return dealRowToOpportunity(rows[0]);
}

export async function createMduDeal(opp: Opportunity): Promise<Opportunity> {
  const pool = getPool();
  const selgerId = await defaultSelgerId();
  const row = opportunityToDealRow(opp, selgerId);
  await pool.query(`
    INSERT INTO sales_core.mdu_deals (
      deal_id, bygg_id, adresse, antall_enheter, status, selger_id,
      verdi_kr, forventet_close, notater, opprettet, sist_oppdatert
    ) VALUES ($1, $2, $3, $4, $5::sales_core.deal_status, $6, $7, $8, $9, $10, $11)
  `, [
    row.dealId, row.byggId, row.adresse, row.antallEnheter, row.status, row.selgerId,
    row.verdiKr, row.forventetClose, row.notater, row.opprettet, row.sistOppdatert,
  ]);
  const created = await getMduDealById(opp.id);
  if (!created) throw new Error('Failed to create MDU deal');
  return created;
}

export async function updateMduDeal(id: string, patch: Partial<Opportunity>): Promise<Opportunity | null> {
  const existing = await getMduDealById(id);
  if (!existing) return null;

  const merged: Opportunity = {
    ...existing,
    ...patch,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  };

  const selgerId = await defaultSelgerId();
  const row = opportunityToDealRow(merged, selgerId);
  const pool = getPool();

  await pool.query(`
    UPDATE sales_core.mdu_deals SET
      bygg_id = $2, adresse = $3, antall_enheter = $4, status = $5::sales_core.deal_status,
      verdi_kr = $6, forventet_close = $7, notater = $8, sist_oppdatert = $9
    WHERE deal_id = $1
  `, [
    row.dealId, row.byggId, row.adresse, row.antallEnheter, row.status,
    row.verdiKr, row.forventetClose, row.notater, merged.updatedAt,
  ]);

  return getMduDealById(id);
}

export async function replaceAllMduDeals(opportunities: Opportunity[]): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM sales_core.mdu_deals');
    const selgerId = await defaultSelgerId();
    for (const opp of opportunities) {
      const row = opportunityToDealRow(opp, selgerId);
      await client.query(`
        INSERT INTO sales_core.mdu_deals (
          deal_id, bygg_id, adresse, antall_enheter, status, selger_id,
          verdi_kr, forventet_close, notater, opprettet, sist_oppdatert
        ) VALUES ($1, $2, $3, $4, $5::sales_core.deal_status, $6, $7, $8, $9, $10, $11)
      `, [
        row.dealId, row.byggId, row.adresse, row.antallEnheter, row.status, row.selgerId,
        row.verdiKr, row.forventetClose, row.notater, row.opprettet, row.sistOppdatert,
      ]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function countMduDeals(): Promise<number> {
  const pool = getPool();
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM sales_core.mdu_deals');
  return rows[0].count as number;
}
