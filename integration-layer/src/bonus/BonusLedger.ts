// ── In-memory ledger for beregnede bonuser (prototype) ──
import { IntegrationEvent } from '../types/domain.js';

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

const MAX_ENTRIES = 200;
const ledger: CalculatedBonus[] = [];

export function recordBonus(bonus: CalculatedBonus): void {
  ledger.unshift(bonus);
  if (ledger.length > MAX_ENTRIES) ledger.pop();
}

export function listBonuses(filters?: {
  sellerName?: string;
  periodMonth?: string;
  limit?: number;
}): CalculatedBonus[] {
  let rows = [...ledger];
  if (filters?.sellerName) {
    const q = filters.sellerName.toLowerCase();
    rows = rows.filter((b) => b.sellerName?.toLowerCase().includes(q));
  }
  if (filters?.periodMonth) {
    rows = rows.filter((b) => b.periodMonth === filters.periodMonth);
  }
  const limit = filters?.limit ?? 50;
  return rows.slice(0, limit);
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

export function clearBonusesForTests(): void {
  ledger.length = 0;
}

export function getLedgerEventSnapshot(): IntegrationEvent[] {
  return ledger.map((b) => ({
    eventId: b.id,
    eventType: 'bonus.calculated',
    source: 'pricing-system',
    occurredAt: b.occurredAt,
    payload: bonusToEventPayload(b),
  }));
}
