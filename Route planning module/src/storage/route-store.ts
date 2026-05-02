// ── RouteStore — fil-basert lagring for RouteAssignments ──
import fs from 'fs';
import path from 'path';
import { RouteAssignment } from '../types';
import logger from '../logger';

const DATA_DIR = path.join(process.cwd(), 'data');
const ROUTES_FILE = path.join(DATA_DIR, 'routes.json');

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

export class RouteStore {
  getAll(): RouteAssignment[] {
    return readJson<RouteAssignment>(ROUTES_FILE);
  }

  getById(id: string): RouteAssignment | undefined {
    return this.getAll().find((r) => r.id === id);
  }

  query(filters: { date?: string; salesRepId?: string; status?: string }): RouteAssignment[] {
    return this.getAll().filter((r) => {
      if (filters.date && r.date !== filters.date) return false;
      if (filters.salesRepId && r.salesRepId !== filters.salesRepId) return false;
      if (filters.status && r.status !== filters.status) return false;
      return true;
    });
  }

  save(route: RouteAssignment): RouteAssignment {
    const all = this.getAll();
    const idx = all.findIndex((r) => r.id === route.id);
    if (idx >= 0) {
      all[idx] = route;
    } else {
      all.push(route);
    }
    writeJson(ROUTES_FILE, all);
    logger.info('route_saved', { routeId: route.id });
    return route;
  }

  saveMany(routes: RouteAssignment[]): void {
    writeJson(ROUTES_FILE, routes);
  }
}

export const routeStore = new RouteStore();
