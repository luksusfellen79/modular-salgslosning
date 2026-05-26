import { TekniskGruppe } from './types';
import { AppContext } from './session';

const TEKNISK_ROLLER = new Set([
  'teknisk-ordre',
  'teknisk-aktivering',
  'teknisk-fiber',
  'teknisk-mobil',
  'teknisk-faktura',
]);

/** Auto-rut Case App basert på hub.rolle_id */
export function resolveCaseContextFromRolle(rolleId?: string): AppContext | null {
  if (!rolleId) return null;
  if (rolleId === 'kundeservice') return { mode: 'kundeservice' };
  if (TEKNISK_ROLLER.has(rolleId)) {
    return { mode: 'teknisk', gruppe: rolleId as TekniskGruppe };
  }
  return null;
}

export function canPickAnyCaseRole(rolleId?: string, jwtRoles?: string[]): boolean {
  if (!rolleId) return true;
  if (rolleId === 'superadmin' || rolleId === 'case-admin') return true;
  return jwtRoles?.includes('case-admin') ?? false;
}

export function allowedTekniskGroups(rolleId?: string, jwtRoles?: string[]): TekniskGruppe[] | 'all' {
  if (canPickAnyCaseRole(rolleId, jwtRoles)) return 'all';
  if (rolleId && TEKNISK_ROLLER.has(rolleId)) return [rolleId as TekniskGruppe];
  return [];
}
