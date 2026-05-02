import { Round, RoundUnit, Seller, UnitVisitStatus } from './types';

const BASE =
  (import.meta.env.VITE_SALES_CORE_URL as string | undefined) ?? 'http://localhost:3005';

// ─── Sellers ─────────────────────────────────────────────────────────────────

export async function fetchSellers(role?: 'seller' | 'manager'): Promise<Seller[]> {
  const url = new URL(`${BASE}/api/sdu/sellers`);
  if (role) url.searchParams.set('role', role);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Sales Core sellers: ${res.status}`);
  return res.json() as Promise<Seller[]>;
}

export async function createSeller(
  data: Pick<Seller, 'name' | 'email' | 'role'> & Partial<Pick<Seller, 'phone' | 'sfId'>>
): Promise<Seller> {
  const res = await fetch(`${BASE}/api/sdu/sellers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Sales Core POST seller: ${res.status}`);
  return res.json() as Promise<Seller>;
}

// ─── Rounds ──────────────────────────────────────────────────────────────────

export async function fetchRounds(filters?: {
  sellerId?: string;
  date?: string;
  status?: string;
}): Promise<Round[]> {
  const url = new URL(`${BASE}/api/sdu/rounds`);
  if (filters?.sellerId) url.searchParams.set('sellerId', filters.sellerId);
  if (filters?.date) url.searchParams.set('date', filters.date);
  if (filters?.status) url.searchParams.set('status', filters.status);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Sales Core rounds: ${res.status}`);
  return res.json() as Promise<Round[]>;
}

export async function fetchRound(id: string): Promise<Round> {
  const res = await fetch(`${BASE}/api/sdu/rounds/${id}`);
  if (!res.ok) throw new Error(`Sales Core round ${id}: ${res.status}`);
  return res.json() as Promise<Round>;
}

export async function createRound(data: {
  name: string;
  date: string;
  seller: { id: string; name: string };
  units: RoundUnit[];
  createdBy: string;
}): Promise<Round> {
  const res = await fetch(`${BASE}/api/sdu/rounds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Sales Core POST round: ${res.status}`);
  return res.json() as Promise<Round>;
}

export async function updateRoundStatus(id: string, status: 'active' | 'completed'): Promise<Round> {
  const res = await fetch(`${BASE}/api/sdu/rounds/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`Sales Core PATCH round: ${res.status}`);
  return res.json() as Promise<Round>;
}

export async function updateUnitStatus(
  roundId: string,
  unitId: string,
  visitStatus: UnitVisitStatus,
  note?: string
): Promise<Round> {
  const res = await fetch(`${BASE}/api/sdu/rounds/${roundId}/units/${unitId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitStatus, note }),
  });
  if (!res.ok) throw new Error(`Sales Core PATCH unit: ${res.status}`);
  return res.json() as Promise<Round>;
}
