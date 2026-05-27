import { AppMode, CaseActor, TekniskGruppe } from './types';

const HUB_KEY = 'salgshub_session';
const APP_KEY = 'case_app_context';

export interface HubSession {
  id?: string;
  name: string;
  email?: string;
  role?: string;
  rolleId?: string;
  jwtRoles?: string[];
  token?: string;
}

export interface AppContext {
  mode: AppMode;
  gruppe?: TekniskGruppe;
}

export function bootstrapHubSession(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('hub_session');
    if (token) {
      localStorage.setItem(HUB_KEY, token);
      window.history.replaceState({}, '', window.location.pathname);
    }
  } catch {
    /* ignore */
  }
}

function normalizeHubSession(raw: HubSession): HubSession {
  const role = raw.role?.toLowerCase();
  let rolleId = raw.rolleId;

  if (!rolleId || rolleId === 'sdu-selger') {
    if (role === 'superadmin' || role === 'admin') rolleId = 'superadmin';
    else if (role === 'kundeservice') rolleId = 'kundeservice';
    else if (role === 'case_admin') rolleId = 'case-admin';
    else if (raw.jwtRoles?.includes('superadmin') || raw.jwtRoles?.includes('admin')) rolleId = 'superadmin';
    else if (raw.jwtRoles?.includes('kundeservice')) rolleId = 'kundeservice';
    else if (raw.jwtRoles?.includes('case-admin')) rolleId = 'case-admin';
    else {
      const teknisk = raw.jwtRoles?.find((r) => r.startsWith('teknisk-'));
      if (teknisk) rolleId = teknisk;
    }
    const email = raw.email?.toLowerCase() ?? '';
    if (!rolleId && email.includes('kundeservice')) rolleId = 'kundeservice';
    const name = raw.name?.toLowerCase() ?? '';
    if (!rolleId && name.includes('kundeservice')) rolleId = 'kundeservice';
  }

  return rolleId && rolleId !== raw.rolleId ? { ...raw, rolleId } : raw;
}

export function getHubSession(): HubSession | null {
  try {
    const raw = localStorage.getItem(HUB_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HubSession;
    return parsed.name ? normalizeHubSession(parsed) : null;
  } catch {
    return null;
  }
}

export function getAppContext(): AppContext | null {
  try {
    const raw = sessionStorage.getItem(APP_KEY);
    return raw ? (JSON.parse(raw) as AppContext) : null;
  } catch {
    return null;
  }
}

export function saveAppContext(ctx: AppContext): void {
  sessionStorage.setItem(APP_KEY, JSON.stringify(ctx));
}

export function clearAppContext(): void {
  sessionStorage.removeItem(APP_KEY);
}

export function getActor(): CaseActor {
  const hub = getHubSession();
  return {
    brukerId: hub?.id ?? 'anonymous',
    brukerNavn: hub?.name ?? 'Ukjent bruker',
  };
}
