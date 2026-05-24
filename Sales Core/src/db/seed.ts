// ── PostgreSQL seed on first startup ──
import { getPool } from './pool';
import { ensureHubRoles, upsertHubUserSeed } from './hubRepository';
import { ensureSduSellerForBruker } from './sduRepository';
import { countMduDeals, replaceAllMduDeals } from './mduRepository';
import { SEED_USER_IDS } from './mappers';
import { Opportunity } from '../types';
import { logger } from '../logger';

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

const HUB_USER_SEED = [
  { id: SEED_USER_IDS.jorn, name: 'Jørn Haga', email: 'jornhaga@gmail.com', pin: '0000', rolleId: 'superadmin' },
  { id: SEED_USER_IDS.per, name: 'Per Andersen', email: 'per.andersen@telenor.com', pin: '1234', rolleId: 'sdu-leder' },
  { id: SEED_USER_IDS.nina, name: 'Nina Lund', email: 'nina.lund@telenor.com', pin: '1234', rolleId: 'mdu-leder' },
  { id: SEED_USER_IDS.kari, name: 'Kari Nordmann', email: 'kari.nordmann@telenor.com', pin: '1234', rolleId: 'sdu-selger' },
  { id: SEED_USER_IDS.ole, name: 'Ole Hansen', email: 'ole.hansen@telenor.com', pin: '1234', rolleId: 'sdu-selger' },
  { id: SEED_USER_IDS.lise, name: 'Lise Berg', email: 'lise.berg@telenor.com', pin: '1234', rolleId: 'mdu-selger' },
  { id: SEED_USER_IDS.erik, name: 'Erik Johansen', email: 'erik.johansen@telenor.com', pin: '1234', rolleId: 'sdu-selger' },
  { id: SEED_USER_IDS.ingrid, name: 'Ingrid Sørensen', email: 'ingrid.sorensen@telenor.com', pin: '1234', rolleId: 'sdu-selger' },
];

const SDU_SELLER_IDS = [
  SEED_USER_IDS.kari,
  SEED_USER_IDS.ole,
  SEED_USER_IDS.lise,
  SEED_USER_IDS.erik,
  SEED_USER_IDS.ingrid,
  SEED_USER_IDS.per,
];

export async function ensurePostgresSeed(): Promise<void> {
  const pool = getPool();
  await pool.query('SELECT 1');

  // Fjern placeholder-brukere fra hub.sql hvis skjemaet er kjørt manuelt
  await pool.query(`DELETE FROM hub.brukere WHERE pin_hash LIKE 'PLACEHOLDER%'`);

  await ensureHubRoles();

  for (const user of HUB_USER_SEED) {
    await upsertHubUserSeed(user);
  }

  for (const selgerId of SDU_SELLER_IDS) {
    await ensureSduSellerForBruker(selgerId);
  }

  const dealCount = await countMduDeals();
  if (dealCount === 0) {
    await replaceAllMduDeals(SEED_OPPORTUNITIES);
    logger.info({ message: 'Seeded MDU deals in PostgreSQL', count: SEED_OPPORTUNITIES.length });
  }
}
