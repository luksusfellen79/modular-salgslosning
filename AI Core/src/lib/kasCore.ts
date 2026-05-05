const KAS_CORE_URL = process.env.KAS_CORE_URL ?? 'http://localhost:4000';

export interface Resident {
  unitId: string;
  buildingId: string;
  unitNumber: string;
  floor: number;
  name: string;
  phone?: string;
  isExistingCustomer: boolean;
  existingProducts: string[];
  previousProducts: string[];
  cancelReason?: string;
  customerSince?: string;
  interestScores: {
    sikre: number;
    mobil: number;
    internett: number;
    produktX: number;
  };
  campaigns: Array<{
    id: string;
    name: string;
    product: string;
    price: string;
    priceNumber: number;
    pitch: string;
  }>;
  upsellProducts: Array<{ name: string; price: number }>;
}

export async function fetchResidentsForBuilding(buildingId: string): Promise<Resident[]> {
  const res = await fetch(`${KAS_CORE_URL}/buildings/${buildingId}/residents/full`);
  if (!res.ok) throw new Error(`KAS Core error: ${res.status}`);
  return res.json() as Promise<Resident[]>;
}
