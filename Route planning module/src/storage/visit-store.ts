// ── VisitStore — fil-basert lagring for Visits ──
import fs from 'fs';
import path from 'path';
import { Visit } from '../types';
import logger from '../logger';

const DATA_DIR = path.join(process.cwd(), 'data');
const VISITS_FILE = path.join(DATA_DIR, 'visits.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T[];
  } catch {
    return [];
  }
}

function writeJson<T>(filePath: string, data: T[]): void {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export class VisitStore {
  getAll(): Visit[] {
    return readJson<Visit>(VISITS_FILE);
  }

  getById(id: string): Visit | undefined {
    return this.getAll().find((v) => v.id === id);
  }

  getByRouteId(routeId: string): Visit[] {
    return this.getAll().filter((v) => v.routeId === routeId);
  }

  getByUnitId(unitId: string): Visit[] {
    return this.getAll().filter((v) => v.unitId === unitId);
  }

  getByRouteAndUnit(routeId: string, unitId: string): Visit | undefined {
    return this.getAll().find((v) => v.routeId === routeId && v.unitId === unitId);
  }

  save(visit: Visit): Visit {
    const all = this.getAll();
    const idx = all.findIndex((v) => v.id === visit.id);
    if (idx >= 0) {
      all[idx] = visit;
    } else {
      all.push(visit);
    }
    writeJson(VISITS_FILE, all);
    logger.info('visit_saved', { visitId: visit.id, status: visit.status });
    return visit;
  }
}

export const visitStore = new VisitStore();
