import { HubUser } from './api';

const KEY = 'salgshub_session';

export function saveSession(user: HubUser): void {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function getSession(): HubUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HubUser) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}

export function hasPermission(permission: string): boolean {
  const user = getSession();
  return user?.permissions.includes(permission as HubUser['permissions'][number]) ?? false;
}
