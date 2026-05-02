// ── Express API router ──
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger';
import {
  customers,
  findCustomerById,
  findCustomersByBuildingId,
  findResidentByUnitId,
  residents,
  searchResidents,
} from '../seed';
import { SDU_PRODUCTS, MDU_PACKAGES, MDU_COMPONENTS } from '../data/products';
import { Customer } from '../types';

// ── In-memory SDU sale records (runtime only, resets on restart) ──
interface SDUSaleRecord {
  id: string;
  unitId: string;
  customerId: string;
  customerName: string;
  address: string;
  soldProducts: string[];
  campaignId?: string;
  campaignName?: string;
  salesRepName?: string;
  notes?: string;
  soldAt: string;
}

const runtimeCustomers: Customer[] = [];
const sduSales: SDUSaleRecord[] = [];

export const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    residents: residents.length,
    customers: customers.length,
    products: {
      sdu: SDU_PRODUCTS.length,
      mduPackages: MDU_PACKAGES.length,
      mduComponents: MDU_COMPONENTS.length,
    },
  });
});

// ─── SDU Product catalog ──────────────────────────────────────────────────────

router.get('/products/sdu', (req: Request, res: Response) => {
  const { category, hasIncentive, activeOnly } = req.query;

  let products = [...SDU_PRODUCTS];

  if (activeOnly !== 'false') {
    products = products.filter((p) => p.isActive);
  }

  if (category) {
    products = products.filter((p) => p.category === category.toString());
  }

  if (hasIncentive === 'true') {
    const now = new Date().toISOString();
    products = products.filter((p) =>
      p.incentives.some((i) => i.validFrom <= now && i.validUntil >= now)
    );
  }

  res.json(products);
});

router.get('/products/sdu/:productId', (req: Request, res: Response) => {
  const product = SDU_PRODUCTS.find((p) => p.productId === req.params.productId);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  res.json(product);
});

// ─── MDU Product catalog ──────────────────────────────────────────────────────

router.get('/products/mdu', (req: Request, res: Response) => {
  const { tier, hasIncentive, activeOnly } = req.query;

  let packages = [...MDU_PACKAGES];

  if (activeOnly !== 'false') {
    packages = packages.filter((p) => p.isActive);
  }

  if (tier) {
    packages = packages.filter((p) => p.tier === tier.toString());
  }

  if (hasIncentive === 'true') {
    const now = new Date().toISOString();
    packages = packages.filter((p) =>
      p.incentives.some((i) => i.validFrom <= now && i.validUntil >= now)
    );
  }

  res.json(packages);
});

router.get('/products/mdu/components', (req: Request, res: Response) => {
  const { category } = req.query;

  let components = [...MDU_COMPONENTS];

  if (category) {
    components = components.filter((c) => c.category === category.toString());
  }

  res.json(components);
});

router.get('/products/mdu/:packageId', (req: Request, res: Response) => {
  const pkg = MDU_PACKAGES.find((p) => p.packageId === req.params.packageId);

  if (!pkg) {
    return res.status(404).json({ error: 'Package not found' });
  }

  // Embed full component objects for convenience
  const defaultComponents = MDU_COMPONENTS.filter((c) =>
    pkg.defaultComponents.includes(c.componentId)
  );
  const availableComponents = MDU_COMPONENTS.filter((c) =>
    pkg.availableComponents.includes(c.componentId)
  );

  res.json({ ...pkg, defaultComponents, availableComponents });
});

router.get('/buildings/:buildingId/residents', (req: Request, res: Response) => {
  const buildingId = req.params.buildingId;
  const buildingResidents = residents.filter((resident) => resident.buildingId === buildingId);

  if (buildingResidents.length === 0) {
    return res.status(404).json({ error: 'Building not found' });
  }

  const summary = buildingResidents.map((resident) => ({
    unitId: resident.unitId,
    name: resident.name,
    isExistingCustomer: resident.isExistingCustomer,
    existingProducts: resident.existingProducts,
  }));

  res.json(summary);
});

router.get('/buildings/:buildingId/residents/full', (req: Request, res: Response) => {
  const buildingId = req.params.buildingId;
  const buildingResidents = residents.filter((resident) => resident.buildingId === buildingId);

  if (buildingResidents.length === 0) {
    return res.status(404).json({ error: 'Building not found' });
  }

  res.json(buildingResidents);
});

router.get('/residents/:unitId', (req: Request, res: Response) => {
  const resident = findResidentByUnitId(req.params.unitId);

  if (!resident) {
    return res.status(404).json({ error: 'Resident not found' });
  }

  res.json(resident);
});

router.get('/customers/:customerId', (req: Request, res: Response) => {
  const customer = findCustomerById(req.params.customerId);

  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  res.json(customer);
});

router.get('/customers', (req: Request, res: Response) => {
  const buildingId = req.query.buildingId?.toString();
  const allCustomers = [...customers, ...runtimeCustomers];

  if (buildingId) {
    return res.json(allCustomers.filter((c) => c.buildingId === buildingId));
  }

  res.json(allCustomers);
});

// ─── SDU: opprett kunde ved salg ─────────────────────────────────────────────

router.post('/customers', (req: Request, res: Response) => {
  const {
    unitId,
    soldProducts = [],
    campaignId,
    campaignName,
    salesRepName,
    notes,
  } = req.body as {
    unitId: string;
    soldProducts?: string[];
    campaignId?: string;
    campaignName?: string;
    salesRepName?: string;
    notes?: string;
  };

  if (!unitId) {
    return res.status(400).json({ error: 'unitId er påkrevd' });
  }

  const resident = findResidentByUnitId(unitId);
  if (!resident) {
    return res.status(404).json({ error: `Ingen beboer funnet for unitId: ${unitId}` });
  }

  // Sjekk om kunden allerede finnes (seed eller runtime)
  const allCustomers = [...customers, ...runtimeCustomers];
  const existing = allCustomers.find((c) => c.unitId === unitId);
  if (existing) {
    // Opprett salgsrekord men returner eksisterende kunde
    const saleRecord: SDUSaleRecord = {
      id: uuidv4(),
      unitId,
      customerId: existing.customerId,
      customerName: existing.name,
      address: existing.address,
      soldProducts,
      campaignId,
      campaignName,
      salesRepName,
      notes,
      soldAt: new Date().toISOString(),
    };
    sduSales.push(saleRecord);
    logger.info('SDU sale registered (existing customer)', { customerId: existing.customerId, soldProducts });
    return res.status(200).json({ customer: existing, sale: saleRecord, created: false });
  }

  // Opprett ny kunde fra resident-data
  const customerId = `sdu-${uuidv4()}`;
  const newCustomer: Customer = {
    customerId,
    name: resident.name,
    phone: resident.phone ?? '',
    email: `${resident.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    address: `${unitId}`,   // adresse hentes fra buildingId-metadata i seed
    postalCode: '',
    city: '',
    unitId: resident.unitId,
    buildingId: resident.buildingId,
    existingProducts: soldProducts.map((name, i) => ({
      productId: `${name}-${customerId}-${i}`,
      name,
      monthlyCost: 0,
      activeSince: new Date().toISOString(),
    })),
    previousProducts: [],
    customerSince: new Date().toISOString(),
    accountValue: 0,
    interestScores: resident.interestScores,
    campaigns: resident.campaigns,
    upsellProducts: resident.upsellProducts,
  };

  runtimeCustomers.push(newCustomer);

  const saleRecord: SDUSaleRecord = {
    id: uuidv4(),
    unitId,
    customerId,
    customerName: resident.name,
    address: unitId,
    soldProducts,
    campaignId,
    campaignName,
    salesRepName,
    notes,
    soldAt: new Date().toISOString(),
  };
  sduSales.push(saleRecord);

  logger.info('SDU new customer created', { customerId, unitId, soldProducts });
  res.status(201).json({ customer: newCustomer, sale: saleRecord, created: true });
});

// ─── SDU: insentiv-administrasjon ────────────────────────────────────────────

router.post('/products/sdu/:productId/incentives', (req: Request, res: Response) => {
  const product = SDU_PRODUCTS.find(p => p.productId === req.params.productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const { name, description, type, value, currency, validFrom, validUntil, visibleToSeller } = req.body as {
    name: string; description: string; type: string;
    value: number; currency?: string; validFrom: string; validUntil: string; visibleToSeller: boolean;
  };
  if (!name || !type || !validFrom || !validUntil) {
    return res.status(400).json({ error: 'name, type, validFrom og validUntil er påkrevd' });
  }

  const newIncentive = {
    id: `inc-${uuidv4().slice(0, 8)}`,
    name, description: description ?? '',
    type, value: Number(value),
    currency: currency ?? undefined,
    validFrom, validUntil,
    visibleToSeller: Boolean(visibleToSeller),
  };

  (product.incentives as typeof newIncentive[]).push(newIncentive);
  logger.info('SDU incentive added', { productId: product.productId, incentiveId: newIncentive.id });
  res.status(201).json(product);
});

router.delete('/products/sdu/:productId/incentives/:incentiveId', (req: Request, res: Response) => {
  const product = SDU_PRODUCTS.find(p => p.productId === req.params.productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const before = product.incentives.length;
  product.incentives = product.incentives.filter(i => i.id !== req.params.incentiveId);
  if (product.incentives.length === before) {
    return res.status(404).json({ error: 'Incentive not found' });
  }

  logger.info('SDU incentive removed', { productId: product.productId, incentiveId: req.params.incentiveId });
  res.json(product);
});

// ─── SDU: hent salgslogg ──────────────────────────────────────────────────────

router.get('/sales/sdu', (_req: Request, res: Response) => {
  res.json(sduSales);
});

router.get('/search', (req: Request, res: Response) => {
  const query = req.query.q?.toString();

  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }

  res.json(searchResidents(query));
});

router.use((req: Request, res: Response) => {
  logger.warn('Route not found', { path: req.path, method: req.method });
  res.status(404).json({ error: 'Not found' });
});
