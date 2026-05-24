// ── Sales Core client for SDU CRM ──
// Fetches round assignments for a seller and persists visit status per unit.
// Note: SDU sales outcomes (new customers) logges via Integration Layer — see integrationLayer.ts.

const BASE =
  (import.meta.env.VITE_SALES_CORE_URL as string | undefined) ?? 'http://localhost:3005';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RoundStatus = 'draft' | 'active' | 'completed';
export type UnitVisitStatus = 'pending' | 'visited' | 'not_home' | 'sold' | 'no_interest';

export interface Seller {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'seller' | 'manager';
  isActive: boolean;
}

export interface RoundUnit {
  unitId: string;
  buildingId: string;
  address: string;
  residentName?: string;
  visitStatus: UnitVisitStatus;
  visitedAt?: string;
  note?: string;
}

export interface Round {
  id: string;
  name: string;
  date: string;
  seller: { id: string; name: string };
  units: RoundUnit[];
  status: RoundStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function fetchSellers(): Promise<Seller[]> {
  const res = await fetch(`${BASE}/api/sdu/sellers?role=seller`);
  if (!res.ok) throw new Error(`Sales Core sellers: ${res.status}`);
  return res.json() as Promise<Seller[]>;
}

export async function fetchRoundsForSeller(sellerId: string, date: string): Promise<Round[]> {
  const url = new URL(`${BASE}/api/sdu/rounds`);
  url.searchParams.set('sellerId', sellerId);
  url.searchParams.set('date', date);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Sales Core rounds: ${res.status}`);
  const rounds = (await res.json()) as Round[];
  return rounds.filter((r) => r.status !== 'completed');
}

export async function updateUnitVisit(
  roundId: string,
  unitId: string,
  visitStatus: UnitVisitStatus,
  options?: {
    note?: string;
    outcome?: string;
    campaignId?: string;
    soldProducts?: string[];
    salesRepName?: string;
    buildingId?: string;
    sellerId?: string;
  },
): Promise<Round> {
  const res = await fetch(`${BASE}/api/sdu/rounds/${roundId}/units/${unitId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitStatus,
      note: options?.note,
      outcome: options?.outcome,
      campaignId: options?.campaignId,
      soldProducts: options?.soldProducts,
      salesRepName: options?.salesRepName,
      buildingId: options?.buildingId,
      sellerId: options?.sellerId,
    }),
  });
  if (!res.ok) throw new Error(`Sales Core PATCH unit: ${res.status}`);
  return res.json() as Promise<Round>;
}
