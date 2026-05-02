import { Resident } from './types';

const BASE =
  (import.meta.env.VITE_KAS_CORE_URL as string | undefined) ?? 'http://localhost:3001';

export async function fetchResidents(buildingId: string): Promise<Resident[]> {
  const res = await fetch(`${BASE}/buildings/${buildingId}/residents/full`);
  if (!res.ok) throw new Error(`KAS Core residents: ${res.status}`);
  return res.json() as Promise<Resident[]>;
}
