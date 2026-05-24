import { Resident, Campaign, UpsellProduct, VisitOutcome } from './types';

const BASE =
  (import.meta.env.VITE_INTEGRATION_LAYER_URL as string | undefined)
  ?? 'https://integration-layer-production.up.railway.app';

const AI_BASE = (import.meta.env.VITE_AI_CORE_URL as string | undefined) ?? 'http://localhost:3000';

const DEFAULT_UPSELL: UpsellProduct[] = [
  { name: 'Safe', price: 100 },
  { name: 'Forsikring', price: 100 },
  { name: 'Wifi router', price: 100 },
];

// ── Integration Layer domain shapes (subset) ──────────────────────────────────

interface ILCampaign {
  campaignId: string;
  name: string;
  tag: string;
  productName: string;
  campaignPrice: number;
  basePrice: number;
  discountPercent: number;
  pitch: string;
  color: string;
}

interface ILResident {
  unitId: string;
  buildingId: string;
  unitNumber: string;
  floor: number;
  name: string;
  phone?: string;
  isExistingCustomer: boolean;
  customerId?: string;
  existingProducts: string[];
  previousProducts: string[];
  cancelReason?: string;
  customerSince?: string;
  interestScores: Resident['interestScores'];
  campaigns: ILCampaign[];
}

function mapCampaign(c: ILCampaign): Campaign {
  return {
    id: c.campaignId,
    name: c.name,
    tag: c.tag,
    product: c.productName,
    price: `${c.campaignPrice.toLocaleString('nb-NO')} kr/md`,
    priceNumber: c.campaignPrice,
    discount: c.discountPercent > 0 ? `${c.discountPercent}%` : '—',
    pitch: c.pitch,
    color: c.color,
  };
}

function mapResident(r: ILResident): Resident {
  return {
    unitId: r.unitId,
    buildingId: r.buildingId,
    unitNumber: r.unitNumber,
    floor: r.floor,
    name: r.name,
    phone: r.phone,
    isExistingCustomer: r.isExistingCustomer,
    customerId: r.customerId,
    existingProducts: r.existingProducts,
    previousProducts: r.previousProducts,
    cancelReason: r.cancelReason,
    customerSince: r.customerSince,
    interestScores: r.interestScores,
    campaigns: r.campaigns.map(mapCampaign),
    upsellProducts: DEFAULT_UPSELL,
  };
}

// ── NBA types (AI Core — uendret) ───────────────────────────────────────────

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

// ── Beboerdata fra Integration Layer ──────────────────────────────────────────

export async function fetchResidents(buildingId: string): Promise<Resident[]> {
  const res = await fetch(`${BASE}/buildings/${buildingId}/residents/full`);
  if (!res.ok) throw new Error(`Integration Layer: ${res.status}`);
  const data = await res.json() as ILResident[];
  return data.map(mapResident);
}

export async function fetchResident(unitId: string): Promise<Resident | null> {
  const res = await fetch(`${BASE}/residents/${unitId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Integration Layer: ${res.status}`);
  const data = await res.json() as ILResident;
  return mapResident(data);
}

// ── Logg SDU-salg via Integration Layer ─────────────────────────────────────

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

  if (outcome !== 'sold') {
    return { logged: false };
  }

  const res = await fetch(`${BASE}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unitId, soldProducts, campaignId, campaignName, salesRepName, notes }),
  });

  if (!res.ok) throw new Error(`Integration Layer POST /customers: ${res.status}`);

  const data = await res.json() as { customer: { customerId: string }; created: boolean };
  return { logged: true, customerId: data.customer.customerId, created: data.created };
}

// ── Next Best Action (AI Core) ────────────────────────────────────────────────

export async function fetchNBA(unitId: string, buildingId: string): Promise<NBARecommendation> {
  const res = await fetch(`${AI_BASE}/nba/sdu/${unitId}?buildingId=${buildingId}`);
  if (!res.ok) throw new Error(`AI Core: ${res.status}`);
  return res.json() as Promise<NBARecommendation>;
}

export async function logNBAOutcome(payload: NBAOutcomePayload): Promise<void> {
  fetch(`${AI_BASE}/nba/outcome`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => { /* silent — learning signal, not critical */ });
}

// ── EventBus — publiser besøksutfall ──────────────────────────────────────────

export async function publishVisitCompleted(payload: {
  unitId: string;
  buildingId: string;
  outcome: VisitOutcome;
  salesRepName?: string;
  roundId?: string;
  campaignId?: string;
  soldProducts?: string[];
}): Promise<void> {
  fetch(`${BASE}/events/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: 'visit.completed',
      payload,
      source: 'mock',
    }),
  }).catch(() => { /* fire-and-forget */ });
}
