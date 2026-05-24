// ── Shared types matching Integration Layer domain ──

export interface InterestScores {
  sikre: number;
  mobil: number;
  internett: number;
  produktX: number;
}

export interface Campaign {
  id: string;
  name: string;
  tag: string;
  product: string;
  price: string;
  priceNumber: number;
  discount: string;
  pitch: string;
  color: string;
}

export interface UpsellProduct {
  name: string;
  price: number;
}

export interface Resident {
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
  interestScores: InterestScores;
  campaigns: Campaign[];
  upsellProducts: UpsellProduct[];
}

// ── Visit outcome ──

export type VisitOutcome =
  | 'sold'
  | 'no_answer'
  | 'rejected'
  | 'followup'
  | 'marketing';

export interface VisitStatus {
  outcome: VisitOutcome;
  campaignId?: string;
  extraProducts?: string[];
  followupNote?: string;
  loggedAt: string;
}

// ── Known buildings (fra Integration Layer / Sales Core seed) ──

export interface Building {
  id: string;
  address: string;
  city: string;
  postalCode: string;
  totalUnits: number;
}

export const BUILDINGS: Building[] = [
  { id: 'building-storgata-12',      address: 'Storgata 12',      city: 'Oslo', postalCode: '0155', totalUnits: 24 },
  { id: 'building-kirkeveien-45',    address: 'Kirkeveien 45',    city: 'Oslo', postalCode: '0368', totalUnits: 18 },
  { id: 'building-ekebergveien-14',  address: 'Ekebergveien 14',  city: 'Oslo', postalCode: '1178', totalUnits: 12 },
];
