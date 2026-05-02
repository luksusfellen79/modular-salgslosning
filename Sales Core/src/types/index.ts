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
