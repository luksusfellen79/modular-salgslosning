// ── Shared types (mirrors Sales Core + Integration Layer) ──

export type SellerRole = 'seller' | 'manager';

export interface Seller {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: SellerRole;
  sfId?: string;
  isActive: boolean;
  createdAt: string;
}

export type RoundStatus = 'draft' | 'active' | 'completed';

export type UnitVisitStatus = 'pending' | 'visited' | 'not_home' | 'sold' | 'no_interest';

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

// ── Integration Layer types ──

export interface Resident {
  unitId: string;
  buildingId: string;
  unitNumber: string;
  floor: number;
  name: string;
  phone?: string;
  isExistingCustomer: boolean;
  existingProducts: string[];
}

export interface Building {
  id: string;
  address: string;
  city: string;
  postalCode: string;
  totalUnits: number;
}

export const BUILDINGS: Building[] = [
  { id: 'building-storgata-12',     address: 'Storgata 12',     city: 'Oslo', postalCode: '0155', totalUnits: 24 },
  { id: 'building-kirkeveien-45',   address: 'Kirkeveien 45',   city: 'Oslo', postalCode: '0368', totalUnits: 18 },
  { id: 'building-ekebergveien-14', address: 'Ekebergveien 14', city: 'Oslo', postalCode: '1178', totalUnits: 12 },
];
