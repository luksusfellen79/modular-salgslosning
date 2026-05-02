import { VisitOutcome } from './types';

const BASE = (import.meta.env.VITE_SALES_CORE_URL as string | undefined) ?? 'http://localhost:3005';

const STAGE_MAP: Record<VisitOutcome, string> = {
  sold:      'closed-won',
  rejected:  'closed-lost',
  no_answer: 'prospect',
  followup:  'qualification',
  marketing: 'prospect',
};

const ANNUAL_VALUE_MAP: Record<string, number> = {
  'Fiber 500/500': 499 * 12,
  'Fiber 1G/1G':   599 * 12,
  'Fiber 250/250': 399 * 12,
  'TV Start':      199 * 12,
  'TV Total':      299 * 12,
  'Mobil 5GB':     299 * 12,
  'Mobil 15GB':    379 * 12,
  'Mobil Fri+':    449 * 12,
  'Nettvern':       99 * 12,
  'Nettvern+':     149 * 12,
  'Produkt X':     199 * 12,
};

function estimateValue(products: string[]): number {
  const total = products.reduce((sum, p) => sum + (ANNUAL_VALUE_MAP[p] ?? 199 * 12), 0);
  return total > 0 ? total : 199 * 12;
}

export async function logVisitOutcome(params: {
  outcome: VisitOutcome;
  residentName: string;
  address: string;        // e.g. "Storgata 12, H0102"
  buildingAddress: string;
  campaignName?: string;
  soldProducts?: string[];
  notes?: string;
}): Promise<void> {
  const { outcome, residentName, address, buildingAddress, campaignName, soldProducts = [], notes } = params;

  const body = {
    name: campaignName
      ? `${campaignName} — ${address}`
      : `Feltsalg — ${address}`,
    accountName: buildingAddress,
    contactName: residentName,
    contactEmail: null,
    units: 1,
    estimatedAnnualValue: estimateValue(soldProducts),
    stage: STAGE_MAP[outcome],
    notes: notes ?? `Feltsalg-besøk. Utfall: ${outcome}${soldProducts.length ? `. Produkter: ${soldProducts.join(', ')}` : ''}`,
  };

  const res = await fetch(`${BASE}/api/opportunities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Sales Core: ${res.status}`);
}
