// ── File-based JSON storage ──
import fs from 'fs';
import path from 'path';
import { Offer, OfferEvent, Opportunity, Round, Seller, HubUser, AppPermission } from '../types';

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), 'data');

function ensureDataDir(): void {
  fs.mkdirSync(dataDir, { recursive: true });
}

function readJsonFile<T>(fileName: string): T {
  ensureDataDir();
  const filePath = path.join(dataDir, fileName);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf-8');
    return JSON.parse('[]') as T;
  }

  const content = fs.readFileSync(filePath, 'utf-8').trim();
  if (!content) {
    fs.writeFileSync(filePath, '[]', 'utf-8');
    return JSON.parse('[]') as T;
  }

  return JSON.parse(content) as T;
}

function writeJsonFile<T>(fileName: string, data: T): void {
  ensureDataDir();
  const filePath = path.join(dataDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function readOpportunities(): Opportunity[] {
  return readJsonFile<Opportunity[]>('opportunities.json');
}

export function writeOpportunities(data: Opportunity[]): void {
  writeJsonFile('opportunities.json', data);
}

export function readOffers(): Offer[] {
  return readJsonFile<Offer[]>('offers.json');
}

export function writeOffers(data: Offer[]): void {
  writeJsonFile('offers.json', data);
}

export function readEvents(): OfferEvent[] {
  return readJsonFile<OfferEvent[]>('events.json');
}

export function writeEvents(data: OfferEvent[]): void {
  writeJsonFile('events.json', data);
}

// ─── SDU storage ──────────────────────────────────────────────────────────────

const SELLER_SEED: Seller[] = [
  { id: 'sel-1', name: 'Kari Nordmann',   email: 'kari.nordmann@telenor.com',   phone: '91234501', role: 'seller',  sfId: '005SDU0001', isActive: true, createdAt: '2026-01-15T08:00:00Z' },
  { id: 'sel-2', name: 'Ole Hansen',      email: 'ole.hansen@telenor.com',      phone: '91234502', role: 'seller',  sfId: '005SDU0002', isActive: true, createdAt: '2026-01-15T08:00:00Z' },
  { id: 'sel-3', name: 'Lise Berg',       email: 'lise.berg@telenor.com',       phone: '91234503', role: 'seller',  sfId: '005SDU0003', isActive: true, createdAt: '2026-01-15T08:00:00Z' },
  { id: 'sel-4', name: 'Erik Johansen',   email: 'erik.johansen@telenor.com',   phone: '91234504', role: 'seller',  sfId: '005SDU0004', isActive: true, createdAt: '2026-01-15T08:00:00Z' },
  { id: 'sel-5', name: 'Ingrid Sørensen', email: 'ingrid.sorensen@telenor.com', phone: '91234505', role: 'seller',  sfId: '005SDU0005', isActive: true, createdAt: '2026-02-01T08:00:00Z' },
  { id: 'sel-6', name: 'Per Andersen',    email: 'per.andersen@telenor.com',    phone: '91234506', role: 'manager', sfId: '005SDU0006', isActive: true, createdAt: '2026-01-15T08:00:00Z' },
];

let _sellersBootstrapped = false;

export function readSellers(): Seller[] {
  const stored = readJsonFile<Seller[]>('sdu-sellers.json');
  if (!_sellersBootstrapped && stored.length === 0) {
    writeJsonFile('sdu-sellers.json', SELLER_SEED);
    _sellersBootstrapped = true;
    return SELLER_SEED;
  }
  _sellersBootstrapped = true;
  return stored;
}

export function writeSellers(data: Seller[]): void {
  writeJsonFile('sdu-sellers.json', data);
}

export function readRounds(): Round[] {
  return readJsonFile<Round[]>('sdu-rounds.json');
}

export function writeRounds(data: Round[]): void {
  writeJsonFile('sdu-rounds.json', data);
}

// ─── Auth: Brukerregister ─────────────────────────────────────────────────────

const ALL_PERMISSIONS: AppPermission[] = ['mdu_crm', 'sdu_crm', 'sdu_planner', 'sdu_incentives'];

const USER_SEED: HubUser[] = [
  {
    id: 'usr-1',
    name: 'Jørn Haga',
    email: 'jornhaga@gmail.com',
    pin: '0000',
    role: 'superadmin',
    permissions: ALL_PERMISSIONS,
    isActive: true,
    createdAt: '2026-01-15T08:00:00Z',
    createdBy: 'system',
  },
  {
    id: 'usr-2',
    name: 'Per Andersen',
    email: 'per.andersen@telenor.com',
    pin: '1234',
    role: 'salgsleder',
    permissions: ['sdu_planner', 'sdu_incentives', 'sdu_crm'],
    isActive: true,
    createdAt: '2026-01-15T08:00:00Z',
    createdBy: 'usr-1',
  },
  {
    id: 'usr-3',
    name: 'Kari Nordmann',
    email: 'kari.nordmann@telenor.com',
    pin: '1234',
    role: 'selger_sdu',
    permissions: ['sdu_crm'],
    isActive: true,
    createdAt: '2026-01-15T08:00:00Z',
    createdBy: 'usr-1',
  },
  {
    id: 'usr-4',
    name: 'Ole Hansen',
    email: 'ole.hansen@telenor.com',
    pin: '1234',
    role: 'selger_sdu',
    permissions: ['sdu_crm'],
    isActive: true,
    createdAt: '2026-01-15T08:00:00Z',
    createdBy: 'usr-1',
  },
  {
    id: 'usr-5',
    name: 'Lise Berg',
    email: 'lise.berg@telenor.com',
    pin: '1234',
    role: 'selger_mdu',
    permissions: ['mdu_crm'],
    isActive: true,
    createdAt: '2026-01-15T08:00:00Z',
    createdBy: 'usr-1',
  },
];

let _usersBootstrapped = false;

export function readUsers(): HubUser[] {
  const stored = readJsonFile<HubUser[]>('auth-users.json');
  if (!_usersBootstrapped && stored.length === 0) {
    writeJsonFile('auth-users.json', USER_SEED);
    _usersBootstrapped = true;
    return USER_SEED;
  }
  _usersBootstrapped = true;
  return stored;
}

export function writeUsers(data: HubUser[]): void {
  writeJsonFile('auth-users.json', data);
}
