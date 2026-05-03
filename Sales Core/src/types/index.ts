// ── Shared type definitions ──
export type OpportunityStage =
  | 'prospect'
  | 'qualification'
  | 'proposal'
  | 'negotiation'
  | 'closed-won'
  | 'closed-lost';

export interface Opportunity {
  id: string;
  name: string;
  accountName: string;
  contactName: string;
  contactEmail: string;
  stage: OpportunityStage;
  closeDate: string;
  estimatedAnnualValue: number;
  units: number;
  notes?: string;
  salesRepName?: string;
  createdAt: string;
  updatedAt: string;
}

export type OfferStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined';

export interface Offer {
  id: string;
  opportunityId: string;
  accountName: string;
  contactName: string;
  contactEmail: string;
  packageId: string;
  packageName: string;
  selectedProducts: string[];
  monthlyPricePerUnit: number;
  discountPercent: number;
  units: number;
  notes?: string;
  salesRepName: string;
  trackingToken: string;
  status: OfferStatus;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
}

export type OfferEventType = 'created' | 'sent' | 'viewed' | 'accepted' | 'declined';

export interface OfferEvent {
  id: string;
  offerId: string;
  opportunityId: string;
  accountName: string;
  contactName: string;
  type: OfferEventType;
  timestamp: string;
  ipAddress?: string;
}

export interface SseNotification {
  type: 'offer.viewed' | 'offer.accepted' | 'offer.declined';
  offerId: string;
  accountName: string;
  contactName: string;
  timestamp: string;
  message: string;
}

// ─── Auth: Brukerregister og tilgangsstyring ──────────────────────────────────

export type AppPermission = 'mdu_crm' | 'sdu_crm' | 'sdu_planner' | 'sdu_incentives';
export type UserRole = 'superadmin' | 'salgsleder' | 'selger_sdu' | 'selger_mdu';

export interface HubUser {
  id: string;
  name: string;
  email: string;
  pin: string;              // 4-sifret PIN, klartekst (pilot)
  role: UserRole;
  permissions: AppPermission[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  createdBy: string;
}

// ─── SDU: Selger-registry og besøksrunder ─────────────────────────────────────

export type SellerRole = 'seller' | 'manager';

export interface Seller {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: SellerRole;
  sfId?: string;          // Salesforce ID — klar for fremtidig sync
  isActive: boolean;
  createdAt: string;
}

export type RoundStatus = 'draft' | 'active' | 'completed';

export interface RoundUnit {
  unitId: string;
  buildingId: string;
  address: string;        // Lesbar adresse for visning
  residentName?: string;
  visitStatus: 'pending' | 'visited' | 'not_home' | 'sold' | 'no_interest';
  visitedAt?: string;
  note?: string;
}

export interface Round {
  id: string;
  name: string;
  date: string;           // ISO-dato, kvelden runden gjelder
  seller: { id: string; name: string };
  units: RoundUnit[];
  status: RoundStatus;
  createdBy: string;      // selgerleder-navn (foreløpig fritekst)
  createdAt: string;
  updatedAt: string;
}
