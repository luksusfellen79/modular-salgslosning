// ── MduCatalogStore — MDU-pakker og komponenter (read-only i PoC) ──

import { MDU_COMPONENTS_SEED, MDU_PACKAGES_SEED } from '../data/mdu-products.js';
import { MDUComponent, MDUPackage, MDUPackageDetail } from '../types/mdu-catalog.js';

class MduCatalogStore {
  private packages: MDUPackage[] = JSON.parse(JSON.stringify(MDU_PACKAGES_SEED)) as MDUPackage[];
  private components: MDUComponent[] = JSON.parse(JSON.stringify(MDU_COMPONENTS_SEED)) as MDUComponent[];

  listPackages(filters: { tier?: string; hasIncentive?: boolean; activeOnly?: boolean }): MDUPackage[] {
    let result = [...this.packages];
    if (filters.activeOnly !== false) {
      result = result.filter(p => p.isActive);
    }
    if (filters.tier) {
      result = result.filter(p => p.tier === filters.tier);
    }
    if (filters.hasIncentive) {
      const now = new Date().toISOString();
      result = result.filter(p =>
        p.incentives.some(i => i.validFrom <= now && i.validUntil >= now),
      );
    }
    return result;
  }

  getPackageById(packageId: string): MDUPackageDetail | undefined {
    const pkg = this.packages.find(p => p.packageId === packageId);
    if (!pkg) return undefined;

    const { defaultComponents: defaultIds, availableComponents: availableIds, ...rest } = pkg;
    const defaultComponents = this.components.filter(c => defaultIds.includes(c.componentId));
    const availableComponents = this.components.filter(c => availableIds.includes(c.componentId));

    return { ...rest, defaultComponents, availableComponents };
  }

  listComponents(category?: string): MDUComponent[] {
    if (!category) return [...this.components];
    return this.components.filter(c => c.category === category);
  }
}

export const mduCatalogStore = new MduCatalogStore();
