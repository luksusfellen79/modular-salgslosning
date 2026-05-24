// ── SeedData — realistiske norske testdata for dev-miljø ──
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Building, Unit, RouteAssignment } from '../types';
import logger from '../logger';

const DATA_DIR = path.join(process.cwd(), 'data');
const BUILDINGS_FILE = path.join(DATA_DIR, 'buildings.json');
const UNITS_FILE = path.join(DATA_DIR, 'units.json');
const ROUTES_FILE = path.join(DATA_DIR, 'routes.json');
const VISITS_FILE = path.join(DATA_DIR, 'visits.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function toUnitId(buildingId: string, unitNumber: string): string {
  return `${buildingId}-${unitNumber.toLowerCase().replace(/\s/g, '-')}`;
}

function generateUnitsForBuilding(
  buildingId: string,
  floors: number,
  unitsPerFloor: number,
): Unit[] {
  const units: Unit[] = [];
  for (let floor = 1; floor <= floors; floor++) {
    for (let pos = 1; pos <= unitsPerFloor; pos++) {
      const unitNumber = `H${String(floor).padStart(2, '0')}${String(pos).padStart(2, '0')}`;
      units.push({
        id: toUnitId(buildingId, unitNumber),
        buildingId,
        unitNumber,
        floor,
        isExistingCustomer: false,
        existingProducts: [],
      });
    }
  }
  return units;
}

function generateRowHouseUnits(buildingId: string, total: number): Unit[] {
  const units: Unit[] = [];
  for (let i = 1; i <= total; i++) {
    const unitNumber = `Enhet ${i}`;
    units.push({
      id: toUnitId(buildingId, unitNumber),
      buildingId,
      unitNumber,
      floor: 1,
      isExistingCustomer: false,
      existingProducts: [],
    });
  }
  return units;
}

export function seedIfEmpty(): void {
  ensureDataDir();

  const today = new Date().toISOString().split('T')[0] ?? '2026-05-01';

  if (!fs.existsSync(BUILDINGS_FILE)) {
    const buildings: Building[] = [
      {
        id: 'building-storgata-12',
        address: 'Storgata 12',
        city: 'Oslo',
        postalCode: '0155',
        totalUnits: 24,
        buildingType: 'apartment_block',
        coordinates: { lat: 59.9127, lng: 10.7461 },
        notes: 'Porttelefon ved inngang',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'building-kirkeveien-45',
        address: 'Kirkeveien 45',
        city: 'Oslo',
        postalCode: '0368',
        totalUnits: 18,
        buildingType: 'apartment_block',
        coordinates: { lat: 59.9242, lng: 10.7184 },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'building-ekebergveien-14',
        address: 'Ekebergveien 14',
        city: 'Oslo',
        postalCode: '1178',
        totalUnits: 12,
        buildingType: 'row_house',
        coordinates: { lat: 59.8939, lng: 10.7934 },
        createdAt: new Date().toISOString(),
      },
    ];
    fs.writeFileSync(BUILDINGS_FILE, JSON.stringify(buildings, null, 2));
    logger.info('seed_buildings_written', { count: buildings.length });
  }

  if (!fs.existsSync(UNITS_FILE)) {
    const units: Unit[] = [
      ...generateUnitsForBuilding('building-storgata-12', 6, 4),
      ...generateUnitsForBuilding('building-kirkeveien-45', 3, 6),
      ...generateRowHouseUnits('building-ekebergveien-14', 12),
    ];
    fs.writeFileSync(UNITS_FILE, JSON.stringify(units, null, 2));
    logger.info('seed_units_written', { count: units.length });
  }

  if (!fs.existsSync(ROUTES_FILE)) {
    const routes: RouteAssignment[] = [
      {
        id: 'route-jonas-today',
        date: today,
        salesRepId: 'rep-field-1',
        salesRepName: 'Jonas Mikkelsen',
        buildingIds: ['building-storgata-12', 'building-kirkeveien-45'],
        status: 'planned',
        createdBy: 'planner-1',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'route-amina-today',
        date: today,
        salesRepId: 'rep-field-2',
        salesRepName: 'Amina Osei',
        buildingIds: ['building-ekebergveien-14'],
        status: 'planned',
        createdBy: 'planner-1',
        createdAt: new Date().toISOString(),
      },
    ];
    fs.writeFileSync(ROUTES_FILE, JSON.stringify(routes, null, 2));
    logger.info('seed_routes_written', { count: routes.length });
  }

  if (!fs.existsSync(VISITS_FILE)) {
    fs.writeFileSync(VISITS_FILE, JSON.stringify([], null, 2));
    logger.info('seed_visits_written', { count: 0 });
  }
}
