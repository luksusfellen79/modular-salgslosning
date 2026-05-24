// ── CustomerAdapter — kundeintelligens for SDU og MDU ──
// Dekker: beboere i bygg, personprofiler, salgskontekst (churn/win-back),
// søk på person og adresse, win-back-kandidater.
//
// Nå:      Mock-data (samme format som Telenor CRM-eksport)
// Prod:    Byttes mot ekte Telenor kundesystem-API via adapter-registeret

import {
  DataSource,
  Resident,
  ResidentSummary,
  Customer,
  CustomerProduct,
  SalesContext,
  SourceMeta,
} from '../../types/domain.js';
import { ICustomerAdapter } from '../IAdapter.js';

const SOURCE: DataSource = 'customer-system';

function meta(): SourceMeta {
  return { source: SOURCE, fetchedAt: new Date().toISOString(), cached: false };
}

// ── Mock-data ─────────────────────────────────────────────────────────────

const RESIDENTS: Resident[] = [
  {
    unitId: 'BYG-001-L01',
    buildingId: 'BYG-001',
    unitNumber: 'H0101',
    floor: 1,
    name: 'Erik Hansen',
    phone: '91234567',
    isExistingCustomer: true,
    customerId: 'KUNDE-001',
    existingProducts: ['T-FIB-500-001', 'T-MOB-TOPP-UBG-001'],
    previousProducts: [],
    customerSince: '2021-03-15',
    interestScores: { sikre: 20, mobil: 75, internett: 85, produktX: 40 },
    campaigns: [],
    meta: meta(),
  },
  {
    unitId: 'BYG-001-L02',
    buildingId: 'BYG-001',
    unitNumber: 'H0102',
    floor: 1,
    name: 'Marte Olsen',
    phone: '92345678',
    isExistingCustomer: true,
    customerId: 'KUNDE-002',
    existingProducts: ['T-FIB-100-001'],
    previousProducts: [],
    customerSince: '2020-08-01',
    interestScores: { sikre: 60, mobil: 45, internett: 70, produktX: 55 },
    campaigns: [],
    meta: meta(),
  },
  {
    unitId: 'BYG-001-L03',
    buildingId: 'BYG-001',
    unitNumber: 'H0201',
    floor: 2,
    name: 'Anders Berg',
    phone: '93456789',
    isExistingCustomer: false,
    existingProducts: [],
    previousProducts: ['T-FIB-500-001'],
    cancelReason: 'Byttet til Altibox',
    interestScores: { sikre: 30, mobil: 60, internett: 90, produktX: 70 },
    campaigns: [],
    meta: meta(),
  },
  {
    unitId: 'BYG-001-L04',
    buildingId: 'BYG-001',
    unitNumber: 'H0202',
    floor: 2,
    name: 'Sofie Dahl',
    phone: '94567890',
    isExistingCustomer: false,
    existingProducts: [],
    previousProducts: [],
    interestScores: { sikre: 15, mobil: 88, internett: 65, produktX: 35 },
    campaigns: [],
    meta: meta(),
  },
  {
    unitId: 'BYG-002-L01',
    buildingId: 'BYG-002',
    unitNumber: 'A0101',
    floor: 1,
    name: 'Lars Iversen',
    phone: '95678901',
    isExistingCustomer: true,
    customerId: 'KUNDE-003',
    existingProducts: ['T-FIB-1000-001', 'T-MOB-TOPP-UBG-001', 'T-MOB-TOPP-UBG-001'],
    previousProducts: [],
    customerSince: '2019-01-10',
    interestScores: { sikre: 10, mobil: 50, internett: 95, produktX: 80 },
    campaigns: [],
    meta: meta(),
  },
  {
    unitId: 'BYG-002-L02',
    buildingId: 'BYG-002',
    unitNumber: 'A0102',
    floor: 1,
    name: 'Kari Nilsen',
    phone: '96789012',
    isExistingCustomer: false,
    existingProducts: [],
    previousProducts: ['T-MOB-TOPP-UBG-001'],
    cancelReason: 'For dyrt',
    interestScores: { sikre: 50, mobil: 72, internett: 55, produktX: 45 },
    campaigns: [],
    meta: meta(),
  },
  {
    unitId: 'BYG-003-L01',
    buildingId: 'BYG-003',
    unitNumber: '101',
    floor: 1,
    name: 'Thomas Lie',
    phone: '97890123',
    isExistingCustomer: false,
    existingProducts: [],
    previousProducts: [],
    interestScores: { sikre: 40, mobil: 65, internett: 75, produktX: 50 },
    campaigns: [],
    meta: meta(),
  },
];

const CUSTOMERS: Customer[] = [
  {
    customerId: 'KUNDE-001',
    name: 'Erik Hansen',
    phone: '91234567',
    email: 'erik.hansen@gmail.com',
    address: 'Storgata 1',
    postalCode: '0155',
    city: 'Oslo',
    unitId: 'BYG-001-L01',
    buildingId: 'BYG-001',
    existingProducts: [
      { productId: 'T-FIB-500-001', name: 'Fiber 500/500', monthlyCost: 599, activeSince: '2021-03-15' },
      { productId: 'T-MOB-TOPP-UBG-001', name: 'Mobil Topp Ubegrenset', monthlyCost: 649, activeSince: '2022-06-01' },
    ],
    previousProducts: [],
    customerSince: '2021-03-15',
    accountValue: 1248,
    interestScores: { sikre: 20, mobil: 75, internett: 85, produktX: 40 },
    campaigns: [],
    meta: meta(),
  },
  {
    customerId: 'KUNDE-002',
    name: 'Marte Olsen',
    phone: '92345678',
    email: 'marte.olsen@outlook.com',
    address: 'Storgata 1',
    postalCode: '0155',
    city: 'Oslo',
    unitId: 'BYG-001-L02',
    buildingId: 'BYG-001',
    existingProducts: [
      { productId: 'T-FIB-100-001', name: 'Fiber 100/100', monthlyCost: 399, activeSince: '2020-08-01' },
    ],
    previousProducts: [],
    customerSince: '2020-08-01',
    accountValue: 399,
    interestScores: { sikre: 60, mobil: 45, internett: 70, produktX: 55 },
    campaigns: [],
    meta: meta(),
  },
  {
    customerId: 'KUNDE-003',
    name: 'Lars Iversen',
    phone: '95678901',
    email: 'lars.iversen@telenor.no',
    address: 'Parkveien 12',
    postalCode: '0350',
    city: 'Oslo',
    unitId: 'BYG-002-L01',
    buildingId: 'BYG-002',
    existingProducts: [
      { productId: 'T-FIB-1000-001', name: 'Fiber 1000/1000', monthlyCost: 799, activeSince: '2019-01-10' },
      { productId: 'T-MOB-TOPP-UBG-001', name: 'Mobil Topp Ubegrenset', monthlyCost: 649, activeSince: '2020-03-01' },
    ],
    previousProducts: [],
    customerSince: '2019-01-10',
    accountValue: 1448,
    interestScores: { sikre: 10, mobil: 50, internett: 95, produktX: 80 },
    campaigns: [],
    meta: meta(),
  },
];

const SALES_CONTEXTS: SalesContext[] = [
  {
    personId: 'BYG-001-L03', // Anders Berg — win-back kandidat
    churnRisk: 'lav',
    churnRiskScore: 15,
    erWinBackKandidat: true,
    tidligereAvgang: '2023-02-01',
    tidligereProdukt: 'Fiber 500/500',
    avgangsÅrsak: 'Byttet til Altibox',
    oppgraderingsPotensial: 75,
    anbefaltProdukt: 'T-FIB-500-001',
    livstidsverdi: 42000,
    meta: meta(),
  },
  {
    personId: 'KUNDE-002', // Marte Olsen — middels churn, oppgraderingskandidat
    churnRisk: 'middels',
    churnRiskScore: 55,
    erWinBackKandidat: false,
    oppgraderingsPotensial: 70,
    anbefaltProdukt: 'T-FIB-500-001',
    livstidsverdi: 28000,
    meta: meta(),
  },
  {
    personId: 'BYG-002-L02', // Kari Nilsen — win-back, churnet pga pris
    churnRisk: 'lav',
    churnRiskScore: 10,
    erWinBackKandidat: true,
    tidligereAvgang: '2024-01-15',
    tidligereProdukt: 'Mobil Topp Ubegrenset',
    avgangsÅrsak: 'For dyrt',
    oppgraderingsPotensial: 60,
    anbefaltProdukt: 'T-MOB-S-UBG-001',
    livstidsverdi: 31000,
    meta: meta(),
  },
];

// ── Adapter-klasse ─────────────────────────────────────────────────────────

export class CustomerAdapter implements ICustomerAdapter {
  readonly sourceId: DataSource = SOURCE;
  readonly name = 'CustomerAdapter';

  async isHealthy(): Promise<boolean> {
    return true;
  }

  // ── ICustomerAdapter ───────────────────────────────────────────────────

  async getResidents(buildingId: string): Promise<Resident[]> {
    return RESIDENTS
      .filter(r => r.buildingId === buildingId)
      .map(r => ({ ...r, meta: meta() }));
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
    const r = RESIDENTS.find(r => r.unitId === unitId);
    return r ? { ...r, meta: meta() } : null;
  }

  async getCustomer(customerId: string): Promise<Customer | null> {
    const c = CUSTOMERS.find(c => c.customerId === customerId);
    return c ? { ...c, meta: meta() } : null;
  }

  async getCustomersByBuilding(buildingId: string): Promise<Customer[]> {
    return CUSTOMERS
      .filter(c => c.buildingId === buildingId)
      .map(c => ({ ...c, meta: meta() }));
  }

  async searchResidents(query: string): Promise<Resident[]> {
    const q = query.toLowerCase();
    return RESIDENTS
      .filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.phone?.includes(q) ||
        r.unitId.toLowerCase().includes(q)
      )
      .map(r => ({ ...r, meta: meta() }));
  }

  // ── Ekstra: salgskontekst (churn / win-back) ───────────────────────────

  async getSalesContext(personId: string): Promise<SalesContext | null> {
    const ctx = SALES_CONTEXTS.find(c => c.personId === personId);
    return ctx ? { ...ctx, meta: meta() } : null;
  }

  async getWinBackCandidates(): Promise<Array<Resident & { salesContext: SalesContext }>> {
    const candidates: Array<Resident & { salesContext: SalesContext }> = [];
    for (const ctx of SALES_CONTEXTS.filter(c => c.erWinBackKandidat)) {
      const resident = RESIDENTS.find(
        r => r.unitId === ctx.personId || r.customerId === ctx.personId
      );
      if (resident) {
        candidates.push({ ...resident, salesContext: { ...ctx, meta: meta() }, meta: meta() });
      }
    }
    return candidates;
  }
}
