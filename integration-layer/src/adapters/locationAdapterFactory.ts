// ── Factory — bytt adapter her når ekte Telenor-oppslag er klart ──

import { LocationAdapter } from './locationAdapter.js';
import { MockLocationAdapter } from './mockLocationAdapter.js';

export function createLocationAdapter(): LocationAdapter {
  return new MockLocationAdapter();
}
