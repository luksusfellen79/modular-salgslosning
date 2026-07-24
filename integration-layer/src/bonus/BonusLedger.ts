// ── Bonus-ledger — dual-mode: PostgreSQL når DATABASE_URL finnes, ellers in-memory ──
import { getPool, hasDb } from '../db.js';

export interface BonusLineItem {
  productId: string;
  productName: string;
  incentiveId: string;
  incentiveName: string;
  bonusKr: number;
}

export interface CalculatedBonus {
  id: string;
  occurredAt: string;
  sellerName?: string;
  sellerId?: string;
  unitId: string;
  buildingId: string;
  roundId?: string;
  visitOutcome: string;
  soldProducts: string[];
  lineItems: BonusLineItem[];
  totalBonusKr: number;
  periodMonth: string;
}

const ledger: CalculatedBonus[] = [];

export async function recordBonus(bonus: CalculatedBonus): Promise<void> {
  if (hasDb()) {
    const pool = getPool();
    await pool.query(
      `INSERT INTO sales_core.beregnede_bonuser
         (bonus_id, opprettet, selger_id, selger_navn, enhet_id, bygg_id,
          runde_id, utfall, solgte_produkter, linjer, total_bonus_kr, periode_maaned)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12)
       ON CONFLICT (bonus_id) DO NOTHING`,
      [
        bonus.id,
        bonus.occurredAt,
        bonus.sellerId ?? null,
        bonus.sellerName ?? null,
        bonus.unitId,
        bonus.buildingId,
        bonus.roundId ?? null,
        bonus.visitOutcome,
        JSON.stringify(bonus.soldProducts),
        JSON.stringify(bonus.lineItems),
        bonus.totalBonusKr,
        bonus.periodMonth,
      ],
    );
    return;
  }
  ledger.unshift(bonus);
}

export async function listBonuses(opts?: {
  sellerName?: string;
  periodMonth?: string;
  limit?: number;
}): Promise<CalculatedBonus[]> {
  const limit = opts?.limit ?? 100;

  if (hasDb()) {
    const pool = getPool();
    const where: string[] = [];
    const params: unknown[] = [];
    if (opts?.sellerName) {
      params.push(`%${opts.sellerName}%`);
      where.push(`selger_navn ILIKE $${params.length}`);
    }
    if (opts?.periodMonth) {
      params.push(opts.periodMonth);
      where.push(`periode_maaned = $${params.length}`);
    }
    params.push(limit);
    const sql = `
      SELECT bonus_id, opprettet, selger_id, selger_navn, enhet_id, bygg_id,
             runde_id, utfall, solgte_produkter, linjer, total_bonus_kr, periode_maaned
      FROM sales_core.beregnede_bonuser
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY opprettet DESC
      LIMIT $${params.length}`;
    const res = await pool.query(sql, params);
    return res.rows.map((r: {
      bonus_id: string;
      opprettet: Date | string;
      selger_id: string | null;
      selger_navn: string | null;
      enhet_id: string;
      bygg_id: string;
      runde_id: string | null;
      utfall: string;
      solgte_produkter: string[] | unknown;
      linjer: BonusLineItem[];
      total_bonus_kr: number;
      periode_maaned: string;
    }) => ({
      id: r.bonus_id,
      occurredAt:
        r.opprettet instanceof Date ? r.opprettet.toISOString() : String(r.opprettet),
      sellerId: r.selger_id ?? undefined,
      sellerName: r.selger_navn ?? undefined,
      unitId: r.enhet_id,
      buildingId: r.bygg_id,
      roundId: r.runde_id ?? undefined,
      visitOutcome: r.utfall,
      soldProducts: r.solgte_produkter as string[],
      lineItems: r.linjer,
      totalBonusKr: r.total_bonus_kr,
      periodMonth: r.periode_maaned,
    }));
  }

  let out = ledger;
  if (opts?.sellerName) {
    const q = opts.sellerName.toLowerCase();
    out = out.filter((b) => (b.sellerName ?? '').toLowerCase().includes(q));
  }
  if (opts?.periodMonth) {
    out = out.filter((b) => b.periodMonth === opts.periodMonth);
  }
  return out.slice(0, limit);
}

export function clearBonusesForTests(): void {
  ledger.length = 0;
}

export function bonusToEventPayload(bonus: CalculatedBonus): Record<string, unknown> {
  return {
    bonusId: bonus.id,
    sellerName: bonus.sellerName,
    sellerId: bonus.sellerId,
    unitId: bonus.unitId,
    buildingId: bonus.buildingId,
    roundId: bonus.roundId,
    visitOutcome: bonus.visitOutcome,
    soldProducts: bonus.soldProducts,
    lineItems: bonus.lineItems,
    totalBonusKr: bonus.totalBonusKr,
    periodMonth: bonus.periodMonth,
  };
}
