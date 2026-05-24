// ── SduCatalogStore — mutable SDU-produktkatalog (PoC in-memory) ──

import { v4 as uuidv4 } from 'uuid';
import { SDU_PRODUCTS_SEED } from '../data/sdu-products.js';
import { Incentive, SDUProduct } from '../types/sdu-catalog.js';

function cloneProducts(products: SDUProduct[]): SDUProduct[] {
  return JSON.parse(JSON.stringify(products)) as SDUProduct[];
}

class SduCatalogStore {
  private products: SDUProduct[] = cloneProducts(SDU_PRODUCTS_SEED);

  list(filters: {
    category?: string;
    hasIncentive?: boolean;
    activeOnly?: boolean;
  }): SDUProduct[] {
    let result = [...this.products];

    if (filters.activeOnly !== false) {
      result = result.filter(p => p.isActive);
    }
    if (filters.category) {
      result = result.filter(p => p.category === filters.category);
    }
    if (filters.hasIncentive) {
      const now = new Date().toISOString();
      result = result.filter(p =>
        p.incentives.some(i => i.validFrom <= now && i.validUntil >= now),
      );
    }
    return result;
  }

  getById(productId: string): SDUProduct | undefined {
    return this.products.find(p => p.productId === productId);
  }

  addIncentive(productId: string, incentive: Omit<Incentive, 'id'>): SDUProduct {
    const product = this.products.find(p => p.productId === productId);
    if (!product) throw new Error('Product not found');

    const newIncentive: Incentive = {
      ...incentive,
      id: `inc-${uuidv4().slice(0, 8)}`,
    };
    product.incentives.push(newIncentive);
    return product;
  }

  removeIncentive(productId: string, incentiveId: string): SDUProduct {
    const product = this.products.find(p => p.productId === productId);
    if (!product) throw new Error('Product not found');

    const before = product.incentives.length;
    product.incentives = product.incentives.filter(i => i.id !== incentiveId);
    if (product.incentives.length === before) {
      throw new Error('Incentive not found');
    }
    return product;
  }
}

export const sduCatalogStore = new SduCatalogStore();
