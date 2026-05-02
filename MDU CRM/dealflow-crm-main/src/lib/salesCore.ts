/**
 * Sales Core API client
 *
 * Wrapper rundt Sales Core REST API (port 3005).
 * Alle funksjoner kaster feil ved nettverksfeil — kaller skal håndtere
 * med try/catch og fallback til mockData ved behov.
 */

const BASE_URL = (import.meta.env.VITE_SALES_CORE_URL as string | undefined) ?? 'http://localhost:3005';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SalesCoreOpportunity {
  id: string;
  name: string;
  accountName: string;
  contactName: string | null;
  contactEmail: string | null;
  stage: string;
  closeDate: string;
  estimatedAnnualValue: number;
  units: number;
  notes?: string;
}

export type OfferStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';

export interface SalesCoreOffer {
  id: string;
  opportunityId: string;
  accountName: string;
  contactName: string | null;
  contactEmail: string | null;
  packageId: string;
  packageName: string;
  selectedProducts: string[];
  monthlyPricePerUnit: number;
  discountPercent: number;
  units: number;
  notes?: string;
  salesRepName: string;
  trackingToken: string;
  trackingUrl: string;
  status: OfferStatus;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOfferPayload {
  opportunityId: string;
  accountName: string;
  contactName?: string | null;
  contactEmail?: string | null;
  packageId: string;
  packageName: string;
  selectedProducts: string[];
  monthlyPricePerUnit: number;
  discountPercent: number;
  units: number;
  notes?: string;
  salesRepName: string;
  /** ISO-dato tilbudet gjelder til. Standard: 30 dager fra nå. */
  validUntil?: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sales Core ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ─── Opportunities ────────────────────────────────────────────────────────────

export async function fetchOpportunities(): Promise<SalesCoreOpportunity[]> {
  return apiFetch<SalesCoreOpportunity[]>('/api/opportunities');
}

// ─── Offers ───────────────────────────────────────────────────────────────────

export async function createOffer(data: CreateOfferPayload): Promise<SalesCoreOffer> {
  // Sett validUntil til 30 dager frem i tid hvis ikke angitt
  const validUntil =
    data.validUntil ??
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return apiFetch<SalesCoreOffer>('/api/offers', {
    method: 'POST',
    body: JSON.stringify({ ...data, validUntil }),
  });
}

export async function sendOffer(offerId: string): Promise<SalesCoreOffer> {
  return apiFetch<SalesCoreOffer>(`/api/offers/${offerId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'sent' }),
  });
}

export { BASE_URL as SALES_CORE_BASE_URL };
