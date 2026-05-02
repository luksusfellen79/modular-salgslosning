// ── API type definitions ──
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
  upsellProducts: string[];
}

export interface Customer {
  customerId: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  postalCode: string;
  city: string;
  unitId: string;
  buildingId: string;
  existingProducts: CustomerProduct[];
  previousProducts: CustomerProduct[];
  cancelReason?: string;
  customerSince: string;
  accountValue: number;
  interestScores: InterestScores;
  campaigns: Campaign[];
  upsellProducts: string[];
}

export interface CustomerProduct {
  productId: string;
  name: string;
  monthlyCost: number;
  activeSince: string;
}

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
  discount: string;
  pitch: string;
  color: string;
}

export interface ResidentSummary {
  unitId: string;
  name: string;
  isExistingCustomer: boolean;
  existingProducts: string[];
}
