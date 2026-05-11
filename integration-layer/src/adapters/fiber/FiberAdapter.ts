// ── FiberAdapter — mock for Telenors Fiber-system ──
// I produksjon: erstatt mock-data med HTTP-kall til det ekte fiber-systemet.
// Adapter-grensesnittet forblir uendret — kun implementasjon byttes.

import { IProductAdapter, ICustomerAdapter } from '../IAdapter.js';
import {
  DataSource,
  Product,
  Resident,
  ResidentSummary,
  Customer,
  Campaign,
  CustomerSegment,
  InterestScores,
  SourceMeta,
} from '../../types/domain.js';

const SOURCE: DataSource = 'fiber-system';

function meta(cached = false): SourceMeta {
  return { source: SOURCE, fetchedAt: new Date().toISOString(), cached };
}

// ─── Fiber-produkter ───────────────────────────────────────────────────────

const FIBER_PRODUCTS: Omit<Product, 'meta'>[] = [
  {
    productId: 'fiber-250',
    name: 'Fiber 250/250',
    category: 'fiber',
    description: 'Fiber bredbånd 250 Mbps symmetrisk',
    basePrice: 449,
    unit: 'monthly',
  },
  {
    productId: 'fiber-500',
    name: 'Fiber 500/500',
    category: 'fiber',
    description: 'Fiber bredbånd 500 Mbps symmetrisk',
    basePrice: 599,
    unit: 'monthly',
  },
  {
    productId: 'fiber-1g',
    name: 'Fiber 1G/1G',
    category: 'fiber',
    description: 'Fiber bredbånd 1 Gbps symmetrisk',
    basePrice: 749,
    unit: 'monthly',
  },
];

// ─── Kampanje-maler ────────────────────────────────────────────────────────

const CAMPAIGN_TEMPLATES = {
  nykunde: {
    campaignId: 'camp-nykunde-fiber',
    name: 'Nykundetilbud Fiber',
    tag: 'Nykunde',
    productId: 'fiber-500',
    productName: 'Fiber 500/500',
    campaignPrice: 299,
    basePrice: 599,
    discountPercent: 50,
    pitch: 'Halvpris i 6 måneder. Ingen bindingstid.',
    color: '#00A650',
    validFrom: '2025-01-01',
    eligibleFor: ['new-customer'] as CustomerSegment[],
  },
  winback: {
    campaignId: 'camp-winback-fiber',
    name: 'Tilbakevinn Fiber',
    tag: 'Win-back',
    productId: 'fiber-500',
    productName: 'Fiber 500/500',
    campaignPrice: 359,
    basePrice: 599,
    discountPercent: 40,
    pitch: '40% rabatt i 6 måneder + gratis router for tidligere kunder.',
    color: '#7B2D8B',
    validFrom: '2025-01-01',
    eligibleFor: ['win-back'] as CustomerSegment[],
  },
  upsell: {
    campaignId: 'camp-upsell-fiber1g',
    name: 'Oppgrader til 1G',
    tag: 'Upsell',
    productId: 'fiber-1g',
    productName: 'Fiber 1G/1G',
    campaignPrice: 637,
    basePrice: 749,
    discountPercent: 15,
    pitch: '15% rabatt på oppgradering til 1G de neste 30 dagene.',
    color: '#0085C3',
    validFrom: '2025-01-01',
    eligibleFor: ['existing-customer'] as CustomerSegment[],
  },
} satisfies Record<string, Omit<Campaign, 'meta'>>;

// ─── Seed-data for beboere (3 bygg) ───────────────────────────────────────

type ResidentSeed = Omit<Resident, 'meta' | 'campaigns'> & { campaigns: Omit<Campaign, 'meta'>[] };

function buildResidents(): ResidentSeed[] {
  const residents: ResidentSeed[] = [];

  const buildings: { id: string; address: string; floors: number; unitsPerFloor: number; format: 'H' | 'Enhet' }[] = [
    { id: 'building-storgata-12', address: 'Storgata 12', floors: 6, unitsPerFloor: 4, format: 'H' },
    { id: 'building-kirkeveien-45', address: 'Kirkeveien 45', floors: 3, unitsPerFloor: 6, format: 'H' },
    { id: 'building-ekebergveien-14', address: 'Ekebergveien 14', floors: 1, unitsPerFloor: 12, format: 'Enhet' },
  ];

  const names = [
    'Anders Hansen', 'Bjørn Olsen', 'Christina Berg', 'David Larsen',
    'Eva Nilsen', 'Frank Johansen', 'Grete Andersen', 'Hans Pedersen',
    'Ingrid Kristiansen', 'Jan Eriksen', 'Kari Halvorsen', 'Lars Thomsen',
    'Maria Martinsen', 'Nils Sørensen', 'Olivia Bakken', 'Per Haugen',
    'Ragna Lie', 'Sigrid Moen', 'Tore Lund', 'Una Dahl',
    'Vegard Holm', 'Wenche Berg', 'Xavier Amundsen', 'Yvonne Strand',
    'Åse Knutsen', 'Bjørg Viken', 'Carl Simonsen', 'Dagny Elstad',
    'Einar Fossum', 'Frida Bjerke', 'Gunnar Hauge', 'Heidi Ruud',
    'Ivar Solheim', 'Jorunn Aas', 'Kjell Berge', 'Lene Hagen',
    'Morten Dalheim', 'Nora Foss', 'Ole Skogen', 'Pia Voll',
    'Ragnar Kolstad', 'Silje Ness', 'Tor Brenden', 'Ulla Rønning',
    'Vidar Eggen', 'Wanda Hegge', 'Xenia Lund', 'Yngve Myhre',
    'Zofia Steen', 'Arild Borge', 'Bente Fjeld', 'Cecilie Grønn',
    'Dag Ulstein', 'Ellen Myhr',
  ];

  const fiberProducts = ['Fiber 500/500', 'Fiber 1G/1G', 'Fiber 250/250'];
  const cancelReasons = ['Prisnivå', 'Byttet til Altibox', 'Byttet til Telenor2', 'Dårlig kundeservice', 'Byttet til Ice'];

  let nameIdx = 0;
  let customerIdCounter = 1000;

  for (const building of buildings) {
    const totalUnits = building.floors * building.unitsPerFloor;

    for (let i = 0; i < totalUnits; i++) {
      const floor = building.format === 'H'
        ? Math.floor(i / building.unitsPerFloor) + 1
        : 1;
      const unitInFloor = (i % building.unitsPerFloor) + 1;

      const unitNumber = building.format === 'H'
        ? `H${String(floor).padStart(2, '0')}${String(unitInFloor).padStart(2, '0')}`
        : `Enhet ${i + 1}`;

      const unitId = `${building.id}-${unitNumber.toLowerCase().replace(/\s/g, '-')}`;
      const name = names[nameIdx % names.length];
      nameIdx++;

      // Fordeling: ~35% eksisterende, ~20% win-back, ~45% ny
      const roll = i % 20;
      const isExisting = roll < 7;
      const isWinback = roll >= 7 && roll < 11;

      const fiberProduct = fiberProducts[i % fiberProducts.length];
      const existingProducts = isExisting ? [fiberProduct] : [];
      const previousProducts = isWinback ? [fiberProducts[(i + 1) % fiberProducts.length]] : [];
      const customerId = isExisting ? `KAS-${customerIdCounter++}` : undefined;
      const cancelReason = isWinback ? cancelReasons[i % cancelReasons.length] : undefined;

      // Interessescorer basert på profil
      const scores: InterestScores = {
        sikre: isExisting ? 45 + (i % 30) : 30 + (i % 40),
        mobil: 40 + (i % 45),
        internett: isExisting && existingProducts.some(p => p.includes('250'))
          ? 70 + (i % 20)
          : isWinback ? 75 + (i % 15) : 60 + (i % 30),
        produktX: 20 + (i % 50),
      };

      // Kampanjer
      const campaigns: Omit<Campaign, 'meta'>[] = [];
      if (!isExisting && !isWinback) campaigns.push(CAMPAIGN_TEMPLATES.nykunde);
      if (isWinback) campaigns.push(CAMPAIGN_TEMPLATES.winback);
      if (isExisting) campaigns.push(CAMPAIGN_TEMPLATES.upsell);

      residents.push({
        unitId,
        buildingId: building.id,
        unitNumber,
        floor,
        name,
        phone: `+4790${String(100000 + (nameIdx * 7919) % 900000)}`,
        isExistingCustomer: isExisting,
        customerId,
        existingProducts,
        previousProducts,
        cancelReason,
        customerSince: isExisting ? `202${i % 4}-0${(i % 9) + 1}-01` : undefined,
        interestScores: scores,
        campaigns: campaigns.map(c => ({ ...c, eligibleFor: [...c.eligibleFor] })),
      });
    }
  }

  return residents;
}

const RESIDENTS: ResidentSeed[] = buildResidents();

// ─── FiberAdapter ──────────────────────────────────────────────────────────

export class FiberAdapter implements IProductAdapter, ICustomerAdapter {
  readonly sourceId: DataSource = 'fiber-system';
  readonly name = 'Fiber System (mock)';

  async isHealthy(): Promise<boolean> {
    return true;
  }

  // ── IProductAdapter ──

  async getProducts(): Promise<Product[]> {
    return FIBER_PRODUCTS.map(p => ({ ...p, meta: meta() }));
  }

  async getProductById(productId: string): Promise<Product | null> {
    const p = FIBER_PRODUCTS.find(x => x.productId === productId);
    return p ? { ...p, meta: meta() } : null;
  }

  // ── ICustomerAdapter ──

  async getResidents(buildingId: string): Promise<Resident[]> {
    return RESIDENTS
      .filter(r => r.buildingId === buildingId)
      .map(r => ({ ...r, campaigns: r.campaigns.map(c => ({ ...c, meta: meta() })), meta: meta() }));
  }

  async getResidentSummaries(buildingId: string): Promise<ResidentSummary[]> {
    return RESIDENTS
      .filter(r => r.buildingId === buildingId)
      .map(r => ({
        unitId: r.unitId,
        name: r.name,
        isExistingCustomer: r.isExistingCustomer,
        existingProducts: r.existingProducts,
      }));
  }

  async getResidentByUnit(unitId: string): Promise<Resident | null> {
    const r = RESIDENTS.find(x => x.unitId === unitId);
    if (!r) return null;
    return { ...r, campaigns: r.campaigns.map(c => ({ ...c, meta: meta() })), meta: meta() };
  }

  async getCustomer(customerId: string): Promise<Customer | null> {
    const r = RESIDENTS.find(x => x.customerId === customerId);
    if (!r) return null;
    return this._residentToCustomer(r);
  }

  async getCustomersByBuilding(buildingId: string): Promise<Customer[]> {
    return RESIDENTS
      .filter(r => r.buildingId === buildingId && r.isExistingCustomer)
      .map(r => this._residentToCustomer(r));
  }

  async searchResidents(query: string): Promise<Resident[]> {
    const q = query.toLowerCase();
    return RESIDENTS
      .filter(r => r.name.toLowerCase().includes(q) || r.unitNumber.toLowerCase().includes(q))
      .map(r => ({ ...r, campaigns: r.campaigns.map(c => ({ ...c, meta: meta() })), meta: meta() }));
  }

  private _residentToCustomer(r: ResidentSeed): Customer {
    return {
      customerId: r.customerId!,
      name: r.name,
      phone: r.phone ?? '',
      unitId: r.unitId,
      buildingId: r.buildingId,
      address: r.buildingId.replace('building-', '').replace(/-/g, ' '),
      postalCode: '0155',
      city: 'Oslo',
      existingProducts: r.existingProducts.map((name, i) => ({
        productId: `fiber-${i}`,
        name,
        monthlyCost: 599,
        activeSince: r.customerSince ?? '2023-01-01',
      })),
      previousProducts: r.previousProducts.map((name, i) => ({
        productId: `fiber-prev-${i}`,
        name,
        monthlyCost: 499,
        activeSince: '2021-01-01',
      })),
      cancelReason: r.cancelReason,
      customerSince: r.customerSince ?? '2023-01-01',
      accountValue: r.existingProducts.length * 599,
      interestScores: r.interestScores,
      campaigns: r.campaigns.map(c => ({ ...c, meta: meta() })),
      meta: meta(),
    };
  }
}
