const AI_BASE = (import.meta.env.VITE_AI_CORE_URL as string | undefined) ?? 'http://localhost:3000';

export interface NBARecommendation {
  product: string;
  campaign: string;
  extras: string[];
  headline: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface MDUDealContext {
  opportunityId: string;
  accountName: string;
  units: number;
  stage: string;
  estimatedAnnualValue?: number;
  contactName?: string;
  previousOutcome?: string;
  packages: Array<{
    id: string;
    name: string;
    tier: string;
    monthlyPrice: number;
    description?: string;
  }>;
}

export async function fetchMDUNBA(context: MDUDealContext): Promise<NBARecommendation> {
  const res = await fetch(`${AI_BASE}/nba/mdu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context),
  });
  if (!res.ok) throw new Error(`AI Core MDU NBA: ${res.status}`);
  return res.json() as Promise<NBARecommendation>;
}
