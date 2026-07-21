// ── Mock LocationAdapter — syntetiske farids til ekte Telenor-adapter byttes inn ──

import { createHash } from 'crypto';
import { Beboer, Coord, Location, TidligereProdukt } from '../domain/location.js';
import { LocationAdapter } from './locationAdapter.js';

function mintFarid(buildingId: string, unitKey: string): string {
  const hash = createHash('sha256')
    .update(`${buildingId}:${unitKey}`)
    .digest('hex')
    .slice(0, 12);
  return `far_${hash}`;
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

const BUILDING_SEEDS: BuildingSeed[] = [
  {
    buildingId: 'building-storgata-12',
    coord: { lat: 59.9139, lon: 10.7522 },
    units: [
      {
        unitKey: 'h0101',
        adresse: 'Storgata 12, H0101',
        beboere: [{ navn: 'Anders Hansen' }],
        tidligereProdukter: [{ navn: 'Fiber 500/500', aktivFra: '2023-01-15' }],
      },
      {
        unitKey: 'h0102',
        adresse: 'Storgata 12, H0102',
        beboere: [{ navn: 'Bjørn Olsen' }],
        tidligereProdukter: [],
      },
      {
        unitKey: 'h0201',
        adresse: 'Storgata 12, H0201',
        beboere: [{ navn: 'Christina Berg' }],
        tidligereProdukter: [
          { navn: 'Fiber 250/250', aktivFra: '2021-06-01', aktivTil: '2024-03-31' },
        ],
      },
    ],
  },
  {
    buildingId: 'building-kirkeveien-45',
    coord: { lat: 59.9281, lon: 10.7145 },
    units: [
      {
        unitKey: 'h0101',
        adresse: 'Kirkeveien 45, H0101',
        beboere: [{ navn: 'David Larsen' }],
        tidligereProdukter: [{ navn: 'Mobil M', aktivFra: '2024-02-01' }],
      },
      {
        unitKey: 'h0102',
        adresse: 'Kirkeveien 45, H0102',
        beboere: [{ navn: 'Eva Nilsen' }],
        tidligereProdukter: [],
      },
    ],
  },
  {
    buildingId: 'building-ekebergveien-14',
    coord: { lat: 59.8998, lon: 10.7703 },
    units: [
      {
        unitKey: 'enhet-1',
        adresse: 'Ekebergveien 14, Enhet 1',
        beboere: [{ navn: 'Frank Johansen' }],
        tidligereProdukter: [{ navn: 'Fiber 1G/1G', aktivFra: '2022-09-01' }],
      },
      {
        unitKey: 'enhet-2',
        adresse: 'Ekebergveien 14, Enhet 2',
        beboere: [{ navn: 'Grete Andersen' }],
        tidligereProdukter: [],
      },
    ],
  },
  {
    buildingId: 'building-grunerlokka-8',
    coord: { lat: 59.9234, lon: 10.7589 },
    units: [
      {
        unitKey: 'h0301',
        adresse: 'Thorvald Meyers gate 8, H0301',
        beboere: [{ navn: 'Hans Pedersen' }],
        tidligereProdukter: [
          { navn: 'Fiber 500/500', aktivFra: '2020-01-01', aktivTil: '2023-12-31' },
          { navn: 'Mobil S', aktivFra: '2024-01-01' },
        ],
      },
    ],
  },
];

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

/** Første seeded farid — brukes i tester. */
export const MOCK_SAMPLE_FARID = mintFarid('building-storgata-12', 'h0101');

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
}
