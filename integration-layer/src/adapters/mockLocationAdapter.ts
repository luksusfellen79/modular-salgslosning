// ── Mock LocationAdapter — syntetiske farids til ekte Telenor-adapter byttes inn ──

import { createHash } from 'crypto';
import { Beboer, Coord, Location, TidligereProdukt } from '../domain/location.js';
import { LocationAdapter } from './locationAdapter.js';
import catalogJson from '../data/buildings-catalog.json';

function mintFarid(buildingId: string, unitKey: string): string {
  const hash = createHash('sha256')
    .update(`${buildingId}:${unitKey}`)
    .digest('hex')
    .slice(0, 12);
  return `far_${hash}`;
}

/** Samme unitKey-format som tidligere hardkodede seeds (lowercase unitNumber). */
function unitKeyFromUnitNumber(unitNumber: string): string {
  return unitNumber.toLowerCase().replace(/\s/g, '-');
}

interface CatalogUnit {
  unitNumber: string;
  floor: number;
  resident: string;
}

interface CatalogBuilding {
  buildingId: string;
  address: string;
  area: string;
  coord: { lat: number; lng: number };
  units: CatalogUnit[];
}

interface UnitSeed {
  unitKey: string;
  adresse: string;
  beboere: Beboer[];
  tidligereProdukter: TidligereProdukt[];
}

interface BuildingSeed {
  buildingId: string;
  coord: Coord;
  units: UnitSeed[];
}

const catalog = catalogJson as CatalogBuilding[];

const BUILDING_SEEDS: BuildingSeed[] = catalog.map((building) => {
  const street = building.address.split(',')[0].trim();
  return {
    buildingId: building.buildingId,
    coord: { lat: building.coord.lat, lon: building.coord.lng },
    units: building.units.map((unit) => ({
      unitKey: unitKeyFromUnitNumber(unit.unitNumber),
      adresse: `${street}, ${unit.unitNumber}`,
      beboere: [{ navn: unit.resident }],
      tidligereProdukter: [],
    })),
  };
});

function buildRegistry(): Map<string, Location> {
  const byFarid = new Map<string, Location>();
  const byBuilding = new Map<string, Location[]>();

  for (const building of BUILDING_SEEDS) {
    const locations: Location[] = [];

    for (const unit of building.units) {
      const farid = mintFarid(building.buildingId, unit.unitKey);
      const location: Location = {
        farid,
        buildingId: building.buildingId,
        coord: building.coord,
        adresse: unit.adresse,
        beboere: unit.beboere,
        tidligereProdukter: unit.tidligereProdukter,
      };
      byFarid.set(farid, location);
      locations.push(location);
    }

    byBuilding.set(building.buildingId, locations);
  }

  return byFarid;
}

/** Seed-verdier for tester. */
export const MOCK_SAMPLE_BUILDING_ID = 'building-storgata-12';
export const MOCK_SAMPLE_FARID = mintFarid(MOCK_SAMPLE_BUILDING_ID, 'h0101');
export const MOCK_SAMPLE_FARID_2 = mintFarid(MOCK_SAMPLE_BUILDING_ID, 'h0102');
export const MOCK_SAMPLE_FARID_3 = mintFarid(MOCK_SAMPLE_BUILDING_ID, 'h0201');
export const MOCK_SAMPLE_FARID_OTHER_BUILDING = mintFarid('building-kirkeveien-45', 'h0101');
export const MOCK_SAMPLE_FARID_EKEBERG = mintFarid('building-ekebergveien-14', 'h0101');
/** Antall boenheter i Storgata 12-seed. */
export const MOCK_SAMPLE_BUILDING_UNIT_COUNT = 3;

export class MockLocationAdapter implements LocationAdapter {
  private readonly byFarid = buildRegistry();
  private readonly byBuilding = new Map<string, Location[]>();

  constructor() {
    for (const building of BUILDING_SEEDS) {
      const locations = building.units.map((unit) => {
        const farid = mintFarid(building.buildingId, unit.unitKey);
        return this.byFarid.get(farid)!;
      });
      this.byBuilding.set(building.buildingId, locations);
    }
  }

  async getByFarid(farid: string): Promise<Location | null> {
    return this.byFarid.get(farid) ?? null;
  }

  async listByBuilding(buildingId: string): Promise<Location[]> {
    return this.byBuilding.get(buildingId) ?? [];
  }

  async resolveMany(farids: string[]): Promise<Location[]> {
    const found: Location[] = [];
    for (const farid of farids) {
      const location = this.byFarid.get(farid);
      if (location) found.push(location);
    }
    return found;
  }
}
