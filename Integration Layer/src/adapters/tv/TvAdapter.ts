// ── TvAdapter — mock for Telenors TV og underholdnings-system ──
// I produksjon: REST-kall eller Kafka-events mot TV-plattformen.

import { IProductAdapter } from '../IAdapter.js';
import { DataSource, Product, SourceMeta } from '../../types/domain.js';

const SOURCE: DataSource = 'tv-system';

function meta(cached = false): SourceMeta {
  return { source: SOURCE, fetchedAt: new Date().toISOString(), cached };
}

const TV_PRODUCTS: Omit<Product, 'meta'>[] = [
  {
    productId: 'tv-start',
    name: 'TV Start',
    category: 'tv',
    description: 'Grunnpakke med 40+ kanaler inkl. NRK, TV2 og Discovery',
    basePrice: 199,
    unit: 'monthly',
    requiresFiber: true,
  },
  {
    productId: 'tv-total',
    name: 'TV Total',
    category: 'tv',
    description: 'Full pakke med 80+ kanaler, sport og film. Inkluderer strømmetjenester.',
    basePrice: 399,
    unit: 'monthly',
    requiresFiber: true,
  },
  {
    productId: 'tv-sport',
    name: 'TV Sport',
    category: 'tv',
    description: 'Alle sportssendinger: Eliteserien, Champions League, F1 og mer',
    basePrice: 299,
    unit: 'monthly',
    requiresFiber: true,
  },
  {
    productId: 'tv-box',
    name: 'TV-boks',
    category: 'tv',
    description: 'Telenor TV-boks med opptaksfunksjon og 4K',
    basePrice: 499,
    unit: 'one-time',
    requiresFiber: true,
  },
];

export class TvAdapter implements IProductAdapter {
  readonly sourceId: DataSource = 'tv-system';
  readonly name = 'TV System (mock)';

  async isHealthy(): Promise<boolean> {
    return true;
  }

  async getProducts(): Promise<Product[]> {
    return TV_PRODUCTS.map(p => ({ ...p, meta: meta() }));
  }

  async getProductById(productId: string): Promise<Product | null> {
    const p = TV_PRODUCTS.find(x => x.productId === productId);
    return p ? { ...p, meta: meta() } : null;
  }
}
