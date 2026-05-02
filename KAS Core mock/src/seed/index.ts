// ── Seed data generator ──
import { v4 as uuidv4 } from 'uuid';
import {
  Campaign,
  Customer,
  CustomerProduct,
  InterestScores,
  Resident,
} from '../types';

const BUILDING_METADATA = {
  'building-storgata-12': {
    address: 'Storgata 12',
    postalCode: '0155',
    city: 'Oslo',
    floors: 6,
    unitsPerFloor: 4,
    unitFormat: 'H',
  },
  'building-kirkeveien-45': {
    address: 'Kirkeveien 45',
    postalCode: '0368',
    city: 'Oslo',
    floors: 3,
    unitsPerFloor: 6,
    unitFormat: 'H',
  },
  'building-ekebergveien-14': {
    address: 'Ekebergveien 14',
    postalCode: '1178',
    city: 'Oslo',
    floors: 1,
    unitsPerFloor: 12,
    unitFormat: 'Enhet',
  },
} as const;

const INTERNET_PRODUCTS = ['Fiber 500/500', 'Fiber 1G/1G', 'Fiber 250/250'] as const;
const TV_PRODUCTS = ['TV Start', 'TV Total'] as const;
const MOBILE_PRODUCTS = ['Mobil 5GB', 'Mobil 15GB', 'Mobil Fri+'] as const;
const SECURITY_PRODUCTS = ['Nettvern', 'Nettvern+'] as const;
const CHURN_REASONS = [
  'Prisnivå',
  'Byttet til Altibox',
  'Byttet til Telenor2',
  'Dårlig kundeservice',
  'Byttet til Ice',
] as const;

const CAMPAIGN_TEMPLATES = {
  nykunde: {
    name: 'Nykundetilbud',
    tag: 'Nykunde',
    product: 'Fiber 500/500',
    price: '299 kr/md i 6 mnd',
    discount: '50%',
    pitch: 'Halvpris i 6 måneder. Ingen bindingstid.',
    color: '#00A650',
  },
  winback: {
    name: 'Tilbakevinn',
    tag: 'Win-back',
    product: 'Fiber 500/500',
    price: '399 kr/md i 6 mnd',
    discount: '40%',
    pitch: '40% rabatt i 6 måneder + gratis router for tidligere kunder.',
    color: '#7B2D8B',
  },
  upsellFiber: {
    name: 'Upsell Fiber 1G',
    tag: 'Upsell',
    product: 'Fiber 1G/1G',
    price: '599 kr/md',
    discount: '15%',
    pitch: '15% rabatt på oppgradering de neste 30 dagene.',
    color: '#0085C3',
  },
  tvUpsell: {
    name: 'TV-pakke tilbud',
    tag: 'TV',
    product: 'TV Total',
    price: '299 kr/md',
    discount: '20%',
    pitch: '20% rabatt på TV Total i 12 måneder. Inkluderer strømming.',
    color: '#005A8E',
  },
  sikre: {
    name: 'Sikre-pakke',
    tag: 'Sikre',
    product: 'Sikre med bredbånd',
    price: '549 kr/md',
    discount: '15%',
    pitch: 'ID-vakt, svindelforsikring og Nettvern+ inkludert.',
    color: '#00A650',
  },
  mobil: {
    name: 'Mobilkampanje',
    tag: 'Mobil',
    product: 'Mobil Fri+',
    price: '449 kr/md',
    discount: '25%',
    pitch: 'Ubegrenset data og fri tale. Bytt nå og spar 150 kr/md.',
    color: '#7B2D8B',
  },
  bundle: {
    name: 'Dobbelpakke',
    tag: 'Bundle',
    product: 'Fiber 500 + Mobil',
    price: '699 kr/md',
    discount: '35%',
    pitch: 'Internett og mobil i én pakke. Spar 35% de første 6 mnd.',
    color: '#F5A623',
  },
  produktX: {
    name: 'Produkt X Pilot',
    tag: 'Pilot',
    product: 'Produkt X',
    price: '199 kr/md',
    discount: '—',
    pitch: 'Eksklusivt pilot-tilbud. Kun tilgjengelig i ditt område.',
    color: '#F5A623',
  },
};

const NAMES = [
  'Aksel Hansen',
  'Ingrid Nilsen',
  'Maja Berg',
  'Oda Johansen',
  'Sofie Olsen',
  'Emil Pedersen',
  'Jonas Kristiansen',
  'Ida Andersen',
  'Henrik Solberg',
  'Emma Larsen',
  'Mathias Karlsen',
  'Sara Eriksen',
  'Nora Bjørnsen',
  'Lars Volden',
  'Julie Aas',
  'Martin Skogen',
  'Hanna Moen',
  'Simen Mikkelsen',
  'Kaja Lien',
  'Anders Hagen',
  'Lea Haug',
  'Kristoffer Myhre',
  'Martine Bø',
  'Fredrik Aune',
  'Helene Haugen',
  'Sander Evensen',
  'Vilde Halvorsen',
  'Oliver Strøm',
  'Tuva Røed',
  'Morten Lie',
  'Selma Knutsen',
  'Elias Ruud',
  'Mina Nygård',
  'Mathilde Solvang',
  'Kasper Aasheim',
  'Nina Seierstad',
  'Jon Hagen',
  'Sigrid Bakke',
  'Pål Tangen',
  'Amalie Eide',
  'Oskar Kristoffersen',
  'Embla Sæther',
  'Lena Skavlan',
  'Erik Bråthen',
  'Helga Grimstad',
  'Eirik Fossen',
  'Tone Bekkelund',
  'Mia Kjær',
  'Eirik Skrede',
  'Linn Sømme',
  'Martine Myrholt',
  'Kari Nilsen',
];

const STATUS_ORDER = [
  ...Array(19).fill('existing'),
  ...Array(11).fill('previous'),
  ...Array(24).fill('never'),
] as const;

type ResidentStatus = typeof STATUS_ORDER[number];

type BuildingId = keyof typeof BUILDING_METADATA;

function getUnitNumbers(buildingId: BuildingId): Array<{ unitNumber: string; floor: number }> {
  const metadata = BUILDING_METADATA[buildingId];
  const units: Array<{ unitNumber: string; floor: number }> = [];

  if (metadata.unitFormat === 'H') {
    for (let floor = 1; floor <= metadata.floors; floor += 1) {
      for (let apartment = 1; apartment <= metadata.unitsPerFloor; apartment += 1) {
        units.push({
          unitNumber: `H${floor.toString().padStart(2, '0')}${apartment.toString().padStart(2, '0')}`,
          floor,
        });
      }
    }
  } else {
    for (let index = 1; index <= metadata.unitsPerFloor; index += 1) {
      units.push({
        unitNumber: `Enhet ${index}`,
        floor: 1,
      });
    }
  }

  return units;
}

function choosePhone(unitIndex: number): string {
  const prefix = 400;
  const suffix = (1000 + unitIndex).toString().slice(-4);
  return `+47 ${prefix} ${suffix}`;
}

function chooseExistingProducts(index: number): string[] {
  const variant = index % 4;

  if (variant === 0) {
    return ['Fiber 500/500'];
  }

  if (variant === 1) {
    return ['Fiber 250/250', 'TV Start'];
  }

  if (variant === 2) {
    return ['Fiber 1G/1G', 'Mobil 15GB', 'Nettvern'];
  }

  return ['Fiber 500/500', 'TV Total', 'Mobil Fri+'];
}

function choosePreviousProducts(index: number): string[] {
  const variant = index % 3;

  if (variant === 0) {
    return ['Fiber 250/250', 'TV Start'];
  }

  if (variant === 1) {
    return ['Mobil 5GB', 'Nettvern'];
  }

  return ['Fiber 500/500'];
}

function randomPastDate(index: number): string {
  const year = 2020 + ((index % 5) as number);
  const month = ((index * 3) % 12) + 1;
  const day = ((index * 5) % 28) + 1;
  return new Date(Date.UTC(year, month - 1, day)).toISOString();
}

function chooseInterestScores(resident: Resident): InterestScores {
  const hasInternet = resident.existingProducts.some((product) => INTERNET_PRODUCTS.includes(product as typeof INTERNET_PRODUCTS[number]));
  const hasTv = resident.existingProducts.some((product) => TV_PRODUCTS.includes(product as typeof TV_PRODUCTS[number]));
  const hasMobile = resident.existingProducts.some((product) => MOBILE_PRODUCTS.includes(product as typeof MOBILE_PRODUCTS[number]));

  if (resident.isExistingCustomer) {
    if (hasInternet && !hasTv && !hasMobile) {
      return { sikre: 55, mobil: 45, internett: 88, produktX: 30 };
    }
    if (hasTv && hasInternet) {
      return { sikre: 65, mobil: 50, internett: 66, produktX: 34 };
    }
    if (hasMobile && hasInternet) {
      return { sikre: 60, mobil: 82, internett: 58, produktX: 38 };
    }

    return { sikre: 60, mobil: 50, internett: 72, produktX: 35 };
  }

  if (resident.previousProducts.length > 0) {
    return { sikre: 50, mobil: 60, internett: 88, produktX: 42 };
  }

  const base = 65 + ((resident.unitNumber.length + resident.name.length) % 15);
  return {
    sikre: 40 + ((resident.unitNumber.length + resident.name.length) % 35),
    mobil: 35 + ((resident.name.length + resident.floor) % 45),
    internett: Math.max(61, Math.min(95, base)),
    produktX: 30 + ((resident.floor * 7 + resident.name.length) % 50),
  };
}

function buildCampaign(template: typeof CAMPAIGN_TEMPLATES[keyof typeof CAMPAIGN_TEMPLATES], resident: Resident): Campaign {
  return {
    id: `${template.name}-${resident.unitId}`,
    name: template.name,
    tag: template.tag,
    product: template.product,
    price: template.price,
    discount: template.discount,
    pitch: template.pitch,
    color: template.color,
  };
}

function chooseCampaigns(resident: Resident): Campaign[] {
  const candidates: Array<keyof typeof CAMPAIGN_TEMPLATES> = ['sikre'];

  if (!resident.isExistingCustomer && resident.previousProducts.length > 0) {
    candidates.push('winback');
  }

  const hasInternet = resident.existingProducts.some((product) => INTERNET_PRODUCTS.includes(product as typeof INTERNET_PRODUCTS[number]));
  const hasTv = resident.existingProducts.some((product) => TV_PRODUCTS.includes(product as typeof TV_PRODUCTS[number]));
  const hasMobile = resident.existingProducts.some((product) => MOBILE_PRODUCTS.includes(product as typeof MOBILE_PRODUCTS[number]));

  if (!hasInternet && !hasTv && !hasMobile) {
    candidates.push('nykunde');
  }

  if (resident.isExistingCustomer && hasInternet && !hasTv) {
    candidates.push('tvUpsell');
  }

  if (resident.isExistingCustomer && hasInternet && hasMobile) {
    candidates.push('bundle');
  }

  if (resident.isExistingCustomer && !candidates.includes('tvUpsell') && !candidates.includes('bundle')) {
    candidates.push('upsellFiber');
  }

  if (!candidates.includes('produktX')) {
    if (candidates.length < 3) {
      candidates.push('produktX');
    }
  }

  const uniqueCampaigns = Array.from(new Set(candidates)).slice(0, 3);
  return uniqueCampaigns.map((key) => buildCampaign(CAMPAIGN_TEMPLATES[key], resident));
}

function buildUpsellProducts(resident: Resident): string[] {
  const suggestions: string[] = [];
  const hasInternet = resident.existingProducts.some((product) => INTERNET_PRODUCTS.includes(product as typeof INTERNET_PRODUCTS[number]));
  const hasTv = resident.existingProducts.some((product) => TV_PRODUCTS.includes(product as typeof TV_PRODUCTS[number]));
  const hasMobile = resident.existingProducts.some((product) => MOBILE_PRODUCTS.includes(product as typeof MOBILE_PRODUCTS[number]));

  if (!hasInternet) {
    suggestions.push('Fiber 500/500');
  } else if (!resident.existingProducts.includes('Fiber 1G/1G')) {
    suggestions.push('Fiber 1G/1G');
  }

  if (!hasTv) {
    suggestions.push('TV Total');
  }

  if (!hasMobile) {
    suggestions.push('Mobil Fri+');
  }

  if (!suggestions.includes('Produkt X')) {
    suggestions.push('Produkt X');
  }

  return suggestions.slice(0, 3);
}

function buildCustomer(record: Resident): Customer {
  const metadata = BUILDING_METADATA[record.buildingId as keyof typeof BUILDING_METADATA];

  const existingProducts = record.existingProducts.map((product, index) => ({
    productId: `${product}-${record.unitId}-${index}`,
    name: product,
    monthlyCost: productCost(product),
    activeSince: record.customerSince ?? new Date().toISOString(),
  }));

  const previousProducts = record.previousProducts.map((product, index) => ({
    productId: `prev-${product}-${record.unitId}-${index}`,
    name: product,
    monthlyCost: productCost(product) * 0.8,
    activeSince: randomPastDate(index),
  }));

  return {
    customerId: record.customerId ?? uuidv4(),
    name: record.name,
    phone: record.phone ?? '+47 4000 0000',
    email: `${record.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    address: `${metadata.address}, ${record.unitNumber}`,
    postalCode: metadata.postalCode,
    city: metadata.city,
    unitId: record.unitId,
    buildingId: record.buildingId,
    existingProducts,
    previousProducts,
    cancelReason: record.cancelReason,
    customerSince: record.customerSince ?? new Date().toISOString(),
    accountValue: Math.max(299, Math.round(existingProducts.reduce((sum, item) => sum + item.monthlyCost, 0))),
    interestScores: record.interestScores,
    campaigns: record.campaigns,
    upsellProducts: record.upsellProducts,
  };
}

function productCost(product: string): number {
  switch (product) {
    case 'Fiber 500/500':
      return 499;
    case 'Fiber 1G/1G':
      return 599;
    case 'Fiber 250/250':
      return 399;
    case 'TV Start':
      return 199;
    case 'TV Total':
      return 299;
    case 'Mobil 5GB':
      return 299;
    case 'Mobil 15GB':
      return 379;
    case 'Mobil Fri+':
      return 449;
    case 'Nettvern':
      return 99;
    case 'Nettvern+':
      return 149;
    default:
      return 199;
  }
}

function buildResidents(): Resident[] {
  const allResidents: Resident[] = [];
  const buildingIds = Object.keys(BUILDING_METADATA) as BuildingId[];
  let index = 0;

  for (const buildingId of buildingIds) {
    const units = getUnitNumbers(buildingId);

    for (const unit of units) {
      const status = STATUS_ORDER[index] as ResidentStatus;
      const name = NAMES[index] ?? `Beboer ${index + 1}`;
      const existingProducts = status === 'existing' ? chooseExistingProducts(index) : [];
      const previousProducts = status === 'previous' ? choosePreviousProducts(index) : [];
      const customerSince = status === 'existing' ? randomPastDate(index + 1) : undefined;
      const customerId = status === 'existing' ? `customer-${buildingId}-${unit.unitNumber}` : undefined;
      const cancelReason = status === 'previous' ? CHURN_REASONS[index % CHURN_REASONS.length] : undefined;

      const resident: Resident = {
        unitId: `${buildingId}-unit-${unit.unitNumber}`,
        buildingId,
        unitNumber: unit.unitNumber,
        floor: unit.floor,
        name,
        phone: choosePhone(index),
        isExistingCustomer: status === 'existing',
        customerId,
        existingProducts,
        previousProducts,
        cancelReason,
        customerSince,
        interestScores: { sikre: 0, mobil: 0, internett: 0, produktX: 0 },
        campaigns: [],
        upsellProducts: [],
      };

      resident.interestScores = chooseInterestScores(resident);
      resident.campaigns = chooseCampaigns(resident);
      resident.upsellProducts = buildUpsellProducts(resident);

      allResidents.push(resident);
      index += 1;
    }
  }

  return allResidents;
}

export const residents: Resident[] = buildResidents();
export const customers: Customer[] = residents
  .filter((resident) => resident.isExistingCustomer && resident.customerId)
  .map(buildCustomer);

export const customerMap: Record<string, Customer> = customers.reduce<Record<string, Customer>>((acc, customer) => {
  acc[customer.customerId] = customer;
  return acc;
}, {});

export function findResidentByUnitId(unitId: string): Resident | undefined {
  return residents.find((resident) => resident.unitId === unitId);
}

export function findCustomerById(customerId: string): Customer | undefined {
  return customerMap[customerId];
}

export function findCustomersByBuildingId(buildingId: string): Customer[] {
  return customers.filter((customer) => customer.buildingId === buildingId);
}

export function searchResidents(query: string): Resident[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) {
    return [];
  }

  return residents.filter((resident) => {
    const building = BUILDING_METADATA[resident.buildingId as keyof typeof BUILDING_METADATA];
    const addressSearch = `${building.address} ${resident.unitNumber}`.toLowerCase();
    return (
      resident.unitId.toLowerCase().includes(normalized) ||
      resident.name.toLowerCase().includes(normalized) ||
      addressSearch.includes(normalized) ||
      resident.buildingId.toLowerCase().includes(normalized)
    );
  });
}
