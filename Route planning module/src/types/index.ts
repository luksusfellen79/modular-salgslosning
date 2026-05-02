// ── Typer — alle domenetyper for route planning-modulen ──

export interface Building {
  id: string;
  address: string;
  city: string;
  postalCode: string;
  totalUnits: number;
  buildingType: 'apartment_block' | 'row_house' | 'detached';
  coordinates?: { lat: number; lng: number };
  notes?: string;
  createdAt: string;
}

export interface Unit {
  id: string;
  buildingId: string;
  unitNumber: string;
  floor: number;
  residentName?: string;
  isExistingCustomer: boolean;
  existingProducts?: string[];
}

export type VisitStatus =
  | 'not_visited'
  | 'no_answer'
  | 'not_interested'
  | 'interested'
  | 'sale_registered'
  | 'existing_customer_upgrade'
  | 'existing_customer_no_change';

export interface Visit {
  id: string;
  unitId: string;
  buildingId: string;
  routeId: string;
  salesRepId: string;
  visitedAt: string;
  status: VisitStatus;
  notes?: string;
  interestedProducts?: string[];
  followUpDate?: string;
}

export interface RouteAssignment {
  id: string;
  date: string;
  salesRepId: string;
  salesRepName: string;
  buildingIds: string[];
  status: 'planned' | 'in_progress' | 'completed';
  createdBy: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
}

export interface BuildingProgress {
  buildingId: string;
  address: string;
  totalUnits: number;
  visitedUnits: number;
  salesRegistered: number;
  status: 'not_started' | 'in_progress' | 'completed';
}

export interface RouteProgress {
  routeId: string;
  totalUnits: number;
  visitedUnits: number;
  notAnswered: number;
  notInterested: number;
  interested: number;
  salesRegistered: number;
  completionPercent: number;
  buildingProgress: BuildingProgress[];
}
