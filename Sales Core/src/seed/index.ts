// ── Seed data initialization ──
import { v4 as uuid } from 'uuid';
import { readEvents, readOffers, readOpportunities, writeEvents, writeOffers, writeOpportunities } from '../storage';
import { Offer, OfferEvent, Opportunity } from '../types';

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

const SEED_OFFERS: Offer[] = [
  {
    id: 'offer-001',
    opportunityId: 'opp-001',
    accountName: 'Parkveien Borettslag',
    contactName: 'Erik Andersen',
    contactEmail: 'erik.andersen@parkveien.no',
    packageId: 'pkg-fiber',
    packageName: 'Fiber+Smart',
    selectedProducts: ['fiber-500', 'router-pro', 'support-24h'],
    monthlyPricePerUnit: 750,
    discountPercent: 10,
    units: 120,
    notes: 'Tilpasset for høyt databruk og driftsovervåkning.',
    salesRepName: 'Sofie Hansen',
    trackingToken: uuid(),
    status: 'sent',
    validUntil: '2026-07-15',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'offer-002',
    opportunityId: 'opp-002',
    accountName: 'Fjordheim Sameie',
    contactName: 'Marte Olsen',
    contactEmail: 'marte.olsen@fjordheim.no',
    packageId: 'pkg-bredband',
    packageName: 'Bredbånd Basis',
    selectedProducts: ['fiber-300', 'router-basic'],
    monthlyPricePerUnit: 650,
    discountPercent: 5,
    units: 80,
    notes: 'Kostnadseffektiv løsning med stabil dekning.',
    salesRepName: 'Jonas Kristiansen',
    trackingToken: uuid(),
    status: 'viewed',
    validUntil: '2026-07-01',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'offer-003',
    opportunityId: 'opp-003',
    accountName: 'Solsiden Borettslag',
    contactName: 'Lars Berg',
    contactEmail: 'lars.berg@solsiden.no',
    packageId: 'pkg-tv-bredband',
    packageName: 'TV+Fiber',
    selectedProducts: ['fiber-500', 'tv-complete'],
    monthlyPricePerUnit: 980,
    discountPercent: 15,
    units: 200,
    notes: 'Draft for intern gjennomgang.',
    salesRepName: 'Ellen Berg',
    trackingToken: uuid(),
    status: 'draft',
    validUntil: '2026-08-15',
    createdAt: now,
    updatedAt: now,
  },
];

const SEED_EVENTS: OfferEvent[] = [
  {
    id: uuid(),
    offerId: 'offer-001',
    opportunityId: 'opp-001',
    accountName: 'Parkveien Borettslag',
    contactName: 'Erik Andersen',
    type: 'created',
    timestamp: now,
  },
  {
    id: uuid(),
    offerId: 'offer-001',
    opportunityId: 'opp-001',
    accountName: 'Parkveien Borettslag',
    contactName: 'Erik Andersen',
    type: 'sent',
    timestamp: now,
  },
  {
    id: uuid(),
    offerId: 'offer-002',
    opportunityId: 'opp-002',
    accountName: 'Fjordheim Sameie',
    contactName: 'Marte Olsen',
    type: 'created',
    timestamp: now,
  },
  {
    id: uuid(),
    offerId: 'offer-002',
    opportunityId: 'opp-002',
    accountName: 'Fjordheim Sameie',
    contactName: 'Marte Olsen',
    type: 'sent',
    timestamp: now,
  },
  {
    id: uuid(),
    offerId: 'offer-002',
    opportunityId: 'opp-002',
    accountName: 'Fjordheim Sameie',
    contactName: 'Marte Olsen',
    type: 'viewed',
    timestamp: now,
  },
];

export function ensureSeedData(): void {
  const opportunities = readOpportunities();
  const offers = readOffers();
  const events = readEvents();

  if (!opportunities.length) {
    writeOpportunities(SEED_OPPORTUNITIES);
  }

  if (!offers.length) {
    writeOffers(SEED_OFFERS);
  }

  if (!events.length) {
    writeEvents(SEED_EVENTS);
  }
}
