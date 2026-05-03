/**
 * Sales Core API client — MDU Leder
 */

const BASE_URL = (import.meta.env.VITE_SALES_CORE_URL as string | undefined) ?? 'http://localhost:3005';

export type WarRoomStatus = 'pending' | 'approved' | 'rejected';

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
  salesRepName?: string;
  createdBy?: string;
  warRoomStatus?: WarRoomStatus;
  warRoomNote?: string;
  warRoomAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesCoreOffer {
  id: string;
  opportunityId: string;
  packageName: string;
  status: string;
  firstViewedAt?: string;
  viewCount: number;
  trackingUrl: string;
  createdAt: string;
}

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

export async function fetchOpportunities(): Promise<SalesCoreOpportunity[]> {
  return apiFetch<SalesCoreOpportunity[]>('/api/opportunities');
}

export async function fetchOffers(): Promise<SalesCoreOffer[]> {
  return apiFetch<SalesCoreOffer[]>('/api/offers');
}

export async function updateOpportunityWarRoom(
  id: string,
  status: WarRoomStatus,
  note?: string
): Promise<SalesCoreOpportunity> {
  return apiFetch<SalesCoreOpportunity>(`/api/opportunities/${id}/warroom`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
  });
}
