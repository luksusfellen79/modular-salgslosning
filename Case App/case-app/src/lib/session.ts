import { AppMode, CaseActor, TekniskGruppe } from './types';

const HUB_KEY = 'salgshub_session';
const APP_KEY = 'case_app_context';

export interface HubSession {
  id?: string;
  name: string;
  email?: string;
  role?: string;
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

export function getHubSession(): HubSession | null {
  try {
    const raw = localStorage.getItem(HUB_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HubSession;
    return parsed.name ? parsed : null;
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
