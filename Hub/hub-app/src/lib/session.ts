import { HubUser, normalizeHubUser, userHasAppPermission, AppPermission } from './api';

const KEY = 'salgshub_session';

export function saveSession(user: HubUser): void {
  localStorage.setItem(KEY, JSON.stringify(normalizeHubUser(user)));
}

export function getSession(): HubUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HubUser;
    return parsed.name ? normalizeHubUser(parsed) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}

export function hasPermission(permission: AppPermission): boolean {
  const user = getSession();
  return user ? userHasAppPermission(user, permission) : false;
}
