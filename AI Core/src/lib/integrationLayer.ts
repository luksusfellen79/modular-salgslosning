const INTEGRATION_LAYER_URL =
  process.env.INTEGRATION_LAYER_URL ?? 'https://integration-layer-production.up.railway.app';

const DEFAULT_UPSELL = [
  { name: 'Safe', price: 100 },
  { name: 'Forsikring', price: 100 },
  { name: 'Wifi router', price: 100 },
];

interface ILCampaign {
  campaignId: string;
  name: string;
  productName: string;
  campaignPrice: number;
  pitch: string;
}

interface ILResident {
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
  campaigns: ILCampaign[];
}

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

function mapResident(r: ILResident): Resident {
  return {
    unitId: r.unitId,
    buildingId: r.buildingId,
    unitNumber: r.unitNumber,
    floor: r.floor,
    name: r.name,
    phone: r.phone,
    isExistingCustomer: r.isExistingCustomer,
    existingProducts: r.existingProducts,
    previousProducts: r.previousProducts,
    cancelReason: r.cancelReason,
    customerSince: r.customerSince,
    interestScores: r.interestScores,
    campaigns: r.campaigns.map(c => ({
      id: c.campaignId,
      name: c.name,
      product: c.productName,
      price: `${c.campaignPrice.toLocaleString('nb-NO')} kr/md`,
      priceNumber: c.campaignPrice,
      pitch: c.pitch,
    })),
    upsellProducts: DEFAULT_UPSELL,
  };
}

export async function fetchResidentsForBuilding(buildingId: string): Promise<Resident[]> {
  const res = await fetch(`${INTEGRATION_LAYER_URL}/buildings/${buildingId}/residents/full`);
  if (!res.ok) throw new Error(`Integration Layer error: ${res.status}`);
  const data = await res.json() as ILResident[];
  return data.map(mapResident);
}
