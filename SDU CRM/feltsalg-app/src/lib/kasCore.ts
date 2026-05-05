import { Resident, VisitOutcome } from './types';

const BASE = (import.meta.env.VITE_KAS_CORE_URL as string | undefined) ?? 'http://localhost:3001';
const AI_BASE = (import.meta.env.VITE_AI_CORE_URL as string | undefined) ?? 'http://localhost:3000';

// ── NBA types ─────────────────────────────────────────────────────────────────

export interface NBARecommendation {
  product: string;
  campaign: string;
  extras: string[];
  headline: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface NBAOutcomePayload {
  unitId: string;
  buildingId: string;
  recommendedProduct: string;
  recommendedCampaign: string;
  actualOutcome: VisitOutcome;
  actualProducts: string[];
  hitRecommendation: boolean;
}

// ── Fetch residents for a building ───────────────────────────────────────────

export async function fetchResidents(buildingId: string): Promise<Resident[]> {
  const res = await fetch(`${BASE}/buildings/${buildingId}/residents/full`);
  if (!res.ok) throw new Error(`KAS Core: ${res.status}`);
  return res.json() as Promise<Resident[]>;
}

// ── Log SDU sale outcome to KAS Core ─────────────────────────────────────────
// SDU-salg hører hjemme i KAS Core (kunde på personnivå, koblet til adresse).
// Sales Core er kun for MDU/borettslag-deals.

export async function logSDUOutcome(params: {
  outcome: VisitOutcome;
  unitId: string;
  soldProducts: string[];
  campaignId?: string;
  campaignName?: string;
  salesRepName?: string;
  notes?: string;
}): Promise<{ logged: boolean; customerId?: string; created?: boolean }> {
  const { outcome, unitId, soldProducts, campaignId, campaignName, salesRepName, notes } = params;

  // Kun "solgt" oppretter/oppdaterer kunde. Andre utfall trenger vi ikke lagre ennå.
  if (outcome !== 'sold') {
    return { logged: false };
  }

  const res = await fetch(`${BASE}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unitId, soldProducts, campaignId, campaignName, salesRepName, notes }),
  });

  if (!res.ok) throw new Error(`KAS Core POST /customers: ${res.status}`);

  const data = await res.json() as { customer: { customerId: string }; created: boolean };
  return { logged: true, customerId: data.customer.customerId, created: data.created };
}

// ── Next Best Action ──────────────────────────────────────────────────────────

export async function fetchNBA(unitId: string, buildingId: string): Promise<NBARecommendation> {
  const res = await fetch(`${AI_BASE}/nba/sdu/${unitId}?buildingId=${buildingId}`);
  if (!res.ok) throw new Error(`AI Core: ${res.status}`);
  return res.json() as Promise<NBARecommendation>;
}

export async function logNBAOutcome(payload: NBAOutcomePayload): Promise<void> {
  // Fire-and-forget — never block the UI
  fetch(`${AI_BASE}/nba/outcome`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => { /* silent — learning signal, not critical */ });
}
