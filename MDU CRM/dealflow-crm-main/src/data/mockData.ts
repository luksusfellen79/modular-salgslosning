// Typer og hjelpefunksjoner — mock-arrays er fjernet, data hentes fra Sales Core

export interface Opportunity {
  id: string;
  name: string;
  accountName: string;
  value: number;
  stage: string;
  closeDate: string;
  owner: { name: string; initials: string; color: string };
  probability: number;
  units: number;
  description?: string;
  contactName?: string;
  contactEmail?: string;
  phone?: string;
  source?: string;
  type?: string;
  createdDate: string;
}

export interface Activity {
  id: string;
  type: 'call' | 'meeting' | 'email' | 'task';
  title: string;
  description?: string;
  date: string;
  completed: boolean;
  opportunityId: string;
}

export interface HistoryEntry {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  date: string;
  user: string;
  opportunityId: string;
}

export interface Product {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  opportunityId: string;
}

export const STAGES = [
  { id: 'prospect', label: 'Prospekt', color: 'stage-prospect' },
  { id: 'qualification', label: 'Kontaktet', color: 'stage-qualification' },
  { id: 'proposal', label: 'Tilbud sendt', color: 'stage-proposal' },
  { id: 'negotiation', label: 'Forhandling', color: 'stage-negotiation' },
  { id: 'closed-won', label: 'Vunnet/Tapt', color: 'stage-closed-won' },
];

export const opportunities: Opportunity[] = [];
export const activities: Activity[] = [];
export const historyEntries: HistoryEntry[] = [];
export const products: Product[] = [];

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

export const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('nb-NO', { month: 'short', day: 'numeric', year: 'numeric' });

export const formatDateTime = (date: string) =>
  new Date(date).toLocaleDateString('nb-NO', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
