import { Resident } from './types';

const BASE =
  (import.meta.env.VITE_INTEGRATION_LAYER_URL as string | undefined)
  ?? 'https://integration-layer-production.up.railway.app';

export async function fetchResidents(buildingId: string): Promise<Resident[]> {
  const res = await fetch(`${BASE}/buildings/${buildingId}/residents/full`);
  if (!res.ok) throw new Error(`Integration Layer: ${res.status}`);
  const data = await res.json() as Array<Resident & { meta?: unknown; campaigns?: unknown[] }>;
  return data.map(({ unitId, buildingId: bid, unitNumber, floor, name, phone, isExistingCustomer, existingProducts }) => ({
    unitId,
    buildingId: bid,
    unitNumber,
    floor,
    name,
    phone,
    isExistingCustomer,
    existingProducts,
  }));
}
