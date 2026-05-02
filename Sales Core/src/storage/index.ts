// ── File-based JSON storage ──
import fs from 'fs';
import path from 'path';
import { Offer, OfferEvent, Opportunity } from '../types';

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
