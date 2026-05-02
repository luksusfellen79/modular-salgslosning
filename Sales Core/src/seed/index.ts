// ── Seed data initialization ──
import { readOpportunities, writeOpportunities } from '../storage';
import { Opportunity } from '../types';

const now = new Date().toISOString();

const SEED_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'opp-001',
    name: 'Parkveien Borettslag — Fellesavtale',
    accountName: 'Parkveien Borettslag',
    contactName: 'Erik Andersen',
    contactEmail: 'erik.andersen@parkveien.no',
    stage: 'proposal',
    closeDate: '2026-06-30',
    estimatedAnnualValue: 1020000,
    units: 120,
    notes: 'Høy prioritet på fiber og driftstjenester.',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'opp-002',
    name: 'Fjordheim Sameie — Bredbånd',
    accountName: 'Fjordheim Sameie',
    contactName: 'Marte Olsen',
    contactEmail: 'marte.olsen@fjordheim.no',
    stage: 'negotiation',
    closeDate: '2026-07-15',
    estimatedAnnualValue: 768000,
    units: 80,
    notes: 'Venter på intern beslutning om oppgradering.',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'opp-003',
    name: 'Solsiden Borettslag — TV+Bredbånd',
    accountName: 'Solsiden Borettslag',
    contactName: 'Lars Berg',
    contactEmail: 'lars.berg@solsiden.no',
    stage: 'qualification',
    closeDate: '2026-08-01',
    estimatedAnnualValue: 1440000,
    units: 200,
    notes: 'Ønsker en komplett pakke for hele borettslaget.',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'opp-004',
    name: 'Berglia Borettslag — Bredbånd',
    accountName: 'Berglia Borettslag',
    contactName: 'Kari Haugen',
    contactEmail: 'kari.haugen@berglia.no',
    stage: 'closed-won',
    closeDate: '2026-03-15',
    estimatedAnnualValue: 518400,
    units: 72,
    notes: 'Avtalen er signert og tatt i bruk.',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'opp-005',
    name: 'Torget Sameie — Pakkeløsning',
    accountName: 'Torget Sameie',
    contactName: 'Ole Strand',
    contactEmail: 'ole.strand@torget.no',
    stage: 'prospect',
    closeDate: '2026-09-01',
    estimatedAnnualValue: 648000,
    units: 90,
    notes: 'Første kontakt tatt, venter på tilbudsforespørsel.',
    createdAt: now,
    updatedAt: now,
  },
];

export function ensureSeedData(): void {
  const opportunities = readOpportunities();
  if (!opportunities.length) {
    writeOpportunities(SEED_OPPORTUNITIES);
  }
  // Tilbud og events starter tomme — fylles via CRM-flyten
}
