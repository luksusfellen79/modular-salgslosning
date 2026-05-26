// ── Typeregister og rutingregler ──
import { getPool, useMemoryStore } from './pool';
import { mapRuleRow, mapTypeRow } from './mappers';
import { CaseType, RoutingRule } from '../types';
import * as memory from './memoryStore';

export async function listCaseTypes(): Promise<CaseType[]> {
  if (useMemoryStore()) return memory.memoryListTypes();
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT type_kode, navn, beskrivelse, sla_timer, sla_aktiv, aktiv
    FROM cases.typeregister WHERE aktiv = TRUE ORDER BY type_kode
  `);
  return rows.map(mapTypeRow);
}

export async function getCaseType(typeKode: string): Promise<CaseType | null> {
  if (useMemoryStore()) return memory.memoryGetType(typeKode);
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT type_kode, navn, beskrivelse, sla_timer, sla_aktiv, aktiv
    FROM cases.typeregister WHERE type_kode = $1 AND aktiv = TRUE
  `, [typeKode]);
  return rows.length ? mapTypeRow(rows[0]) : null;
}

export async function listRoutingRules(): Promise<RoutingRule[]> {
  if (useMemoryStore()) return memory.memoryListRules();
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT regel_id, type_kode, malgruppe, prioritet, auto_tildel, aktiv
    FROM cases.rutingregler WHERE aktiv = TRUE ORDER BY prioritet, type_kode
  `);
  return rows.map(mapRuleRow);
}

export async function getRoutingRule(typeKode: string): Promise<RoutingRule | null> {
  if (useMemoryStore()) return memory.memoryGetRule(typeKode);
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT regel_id, type_kode, malgruppe, prioritet, auto_tildel, aktiv
    FROM cases.rutingregler WHERE type_kode = $1 AND aktiv = TRUE
    ORDER BY prioritet LIMIT 1
  `, [typeKode]);
  return rows.length ? mapRuleRow(rows[0]) : null;
}
