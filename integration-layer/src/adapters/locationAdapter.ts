// ── LocationAdapter — oppslag på boenhet via opaque farid ──

import { Location } from '../domain/location.js';

export interface LocationAdapter {
  getByFarid(farid: string): Promise<Location | null>;
  listByBuilding?(buildingId: string): Promise<Location[]>;
}
