// ── MobileAdapter — mock for Telenors Mobil-system ──
// I produksjon: erstatt med HTTP-kall (REST eller Kafka-consumer) mot mobil-backenden.

import { IProductAdapter } from '../IAdapter.js';
import { DataSource, Product, SourceMeta } from '../../types/domain.js';

const SOURCE: DataSource = 'mobile-system';

function meta(cached = false): SourceMeta {
  return { source: SOURCE, fetchedAt: new Date().toISOString(), cached };
}

const MOBILE_PRODUCTS: Omit<Product, 'meta'>[] = [
  {
    productId: 'mobil-5gb',
    name: 'Mobil 5GB',
    category: 'mobile',
    description: '5 GB data, fri tale og SMS i Norge',
    basePrice: 249,
    unit: 'monthly',
  },
  {
    productId: 'mobil-15gb',
    name: 'Mobil 15GB',
    category: 'mobile',
    description: '15 GB data, fri tale og SMS i Norge + Norden',
    basePrice: 349,
    unit: 'monthly',
  },
  {
    productId: 'mobil-friplus',
    name: 'Mobil Fri+',
    category: 'mobile',
    description: 'Ubegrenset data, fri tale og SMS globalt',
    basePrice: 599,
    unit: 'monthly',
  },
  {
    productId: 'mobil-friplus-familie',
    name: 'Mobil Fri+ Familie',
    category: 'mobile',
    description: 'Ubegrenset data for hele familien — inntil 4 SIM-kort',
    basePrice: 899,
    unit: 'monthly',
  },
];

export class MobileAdapter implements IProductAdapter {
  readonly sourceId: DataSource = 'mobile-system';
  readonly name = 'Mobile System (mock)';

  async isHealthy(): Promise<boolean> {
    return true;
  }

  async getProducts(): Promise<Product[]> {
    return MOBILE_PRODUCTS.map(p => ({ ...p, meta: meta() }));
  }

  async getProductById(productId: string): Promise<Product | null> {
    const p = MOBILE_PRODUCTS.find(x => x.productId === productId);
    return p ? { ...p, meta: meta() } : null;
  }
}
