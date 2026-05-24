// ── MDU produktkatalog — typer for borettslag-pakker ──

import { Incentive } from './sdu-catalog.js';

export type MDUComponentCategory =
  | 'internett'
  | 'tv'
  | 'strømming'
  | 'sikkerhet'
  | 'utstyr';

export interface MDUComponent {
  componentId: string;
  name: string;
  category: MDUComponentCategory;
  description: string;
  points: number;
  costPerUnit: number;
  specs?: Record<string, string>;
  isDefault: boolean;
}

export interface MDUPackage {
  packageId: string;
  name: string;
  tier: 'S' | 'M' | 'L' | 'XL';
  description: string;
  monthlyPricePerUnit: number;
  costPerUnit: number;
  commissionRate: number;
  totalPoints: number;
  defaultComponents: string[];
  availableComponents: string[];
  color: string;
  featured?: boolean;
  incentives: Incentive[];
  isActive: boolean;
}

/** Pakke med resolved komponent-objekter (GET /products/mdu/:packageId) */
export interface MDUPackageDetail extends Omit<MDUPackage, 'defaultComponents' | 'availableComponents'> {
  defaultComponents: MDUComponent[];
  availableComponents: MDUComponent[];
}
