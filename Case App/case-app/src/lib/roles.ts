import { TekniskGruppe } from './types';
import { AppContext, HubSession } from './session';

const TEKNISK_ROLLER = new Set([
  'teknisk-ordre',
  'teknisk-aktivering',
  'teknisk-fiber',
  'teknisk-mobil',
  'teknisk-faktura',
]);

/** Alle roller som skal ha tilgang til Case App */
export const CASE_ACCESS_ROLLE_IDS = new Set([
  'superadmin',
  'admin',
  'case-admin',
  'kundeservice',
  'teknisk-ordre',
  'teknisk-aktivering',
  'teknisk-fiber',
  'teknisk-mobil',
  'teknisk-faktura',
]);

const ADMIN_ROLLE_IDS = new Set(['superadmin', 'admin', 'case-admin']);

/** Utled rolleId fra session — håndterer eldre Hub-sessions uten rolleId */
export function getEffectiveRolleId(hub?: HubSession | null): string | undefined {
  if (!hub) return undefined;
  if (hub.rolleId && hub.rolleId.length > 0) return hub.rolleId;

  const role = hub.role?.toLowerCase();
  if (role === 'superadmin' || role === 'admin') return 'superadmin';
  if (role === 'kundeservice') return 'kundeservice';
  if (role === 'case_admin') return 'case-admin';
  if (role === 'case_teknisk') {
    const teknisk = hub.jwtRoles?.find((r) => TEKNISK_ROLLER.has(r));
    return teknisk;
  }

  if (hub.jwtRoles?.length) {
    if (hub.jwtRoles.includes('superadmin') || hub.jwtRoles.includes('admin')) return 'superadmin';
    if (hub.jwtRoles.includes('case-admin')) return 'case-admin';
    if (hub.jwtRoles.includes('kundeservice')) return 'kundeservice';
    const teknisk = hub.jwtRoles.find((r) => TEKNISK_ROLLER.has(r));
    if (teknisk) return teknisk;
  }

  const email = hub.email?.toLowerCase() ?? '';
  if (email.includes('kundeservice')) return 'kundeservice';

  const name = hub.name?.toLowerCase() ?? '';
  if (name.includes('kundeservice')) return 'kundeservice';

  return undefined;
}

export function hasCaseAppAccess(hub?: HubSession | null): boolean {
  if (!hub?.name) return false;
  const rid = getEffectiveRolleId(hub);
  if (rid && CASE_ACCESS_ROLLE_IDS.has(rid)) return true;
  if (hub.jwtRoles?.some((r) => CASE_ACCESS_ROLLE_IDS.has(r))) return true;
  const role = hub.role?.toLowerCase();
  return role === 'superadmin' || role === 'admin' || role === 'kundeservice'
    || role === 'case_admin' || role === 'case_teknisk';
}

/** Auto-rut Case App basert på hub.rolle_id */
export function resolveCaseContextFromRolle(rolleId?: string): AppContext | null {
  if (!rolleId) return null;
  if (rolleId === 'kundeservice') return { mode: 'kundeservice' };
  if (TEKNISK_ROLLER.has(rolleId)) {
    return { mode: 'teknisk', gruppe: rolleId as TekniskGruppe };
  }
  return null;
}

/** Superadmin/admin/case-admin velger arbeidsflate; andre auto-rutes */
export function canPickAnyCaseRole(hub?: HubSession | null): boolean {
  const rid = getEffectiveRolleId(hub);
  if (!rid) return true;
  if (ADMIN_ROLLE_IDS.has(rid)) return true;
  if (hub?.jwtRoles?.some((r) => ADMIN_ROLLE_IDS.has(r))) return true;
  const role = hub?.role?.toLowerCase();
  return role === 'superadmin' || role === 'admin' || role === 'case_admin';
}

export function allowedTekniskGroups(hub?: HubSession | null): TekniskGruppe[] | 'all' {
  if (canPickAnyCaseRole(hub)) return 'all';
  const rid = getEffectiveRolleId(hub);
  if (rid && TEKNISK_ROLLER.has(rid)) return [rid as TekniskGruppe];
  return [];
}
