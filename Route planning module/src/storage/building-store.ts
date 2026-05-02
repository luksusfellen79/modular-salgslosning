// ── BuildingStore — fil-basert lagring for Buildings og Units ──
import fs from 'fs';
import path from 'path';
import { Building, Unit } from '../types';
import logger from '../logger';

const DATA_DIR = path.join(process.cwd(), 'data');
const BUILDINGS_FILE = path.join(DATA_DIR, 'buildings.json');
const UNITS_FILE = path.join(DATA_DIR, 'units.json');

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

export class BuildingStore {
  getAll(): Building[] {
    return readJson<Building>(BUILDINGS_FILE);
  }

  getById(id: string): Building | undefined {
    return this.getAll().find((b) => b.id === id);
  }

  save(building: Building): Building {
    const all = this.getAll();
    const idx = all.findIndex((b) => b.id === building.id);
    if (idx >= 0) {
      all[idx] = building;
    } else {
      all.push(building);
    }
    writeJson(BUILDINGS_FILE, all);
    logger.info('building_saved', { buildingId: building.id });
    return building;
  }

  saveMany(buildings: Building[]): void {
    writeJson(BUILDINGS_FILE, buildings);
  }

  getUnitsForBuilding(buildingId: string): Unit[] {
    return readJson<Unit>(UNITS_FILE).filter((u) => u.buildingId === buildingId);
  }

  getUnitById(id: string): Unit | undefined {
    return readJson<Unit>(UNITS_FILE).find((u) => u.id === id);
  }

  saveUnit(unit: Unit): Unit {
    const all = readJson<Unit>(UNITS_FILE);
    const idx = all.findIndex((u) => u.id === unit.id);
    if (idx >= 0) {
      all[idx] = unit;
    } else {
      all.push(unit);
    }
    writeJson(UNITS_FILE, all);
    return unit;
  }

  saveManyUnits(units: Unit[]): void {
    const existing = readJson<Unit>(UNITS_FILE);
    const newIds = new Set(units.map((u) => u.id));
    const kept = existing.filter((u) => !newIds.has(u.id));
    writeJson(UNITS_FILE, [...kept, ...units]);
  }

  initUnits(units: Unit[]): void {
    writeJson(UNITS_FILE, units);
  }
}

export const buildingStore = new BuildingStore();
