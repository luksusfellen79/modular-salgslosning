const SALES_CORE = (import.meta.env.VITE_SALES_CORE_URL as string | undefined) ?? 'http://localhost:3005';

export type AppPermission =
  | 'mdu_crm'
  | 'mdu_leder'
  | 'sdu_crm'
  | 'sdu_planner'
  | 'sdu_incentives'
  | 'case_app';

export type UserRole =
  | 'superadmin'
  | 'salgsleder'
  | 'selger_sdu'
  | 'selger_mdu'
  | 'kundeservice'
  | 'case_admin'
  | 'case_teknisk';

export interface HubUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: AppPermission[];
  rolleId: string;
  jwtRoles: string[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  createdBy: string;
}

export interface LoginResult extends HubUser {
  token: string;
}

export async function login(name: string, pin: string): Promise<LoginResult> {
  const res = await fetch(`${SALES_CORE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, pin }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? 'Innlogging feilet');
  }
  return res.json() as Promise<LoginResult>;
}

export async function fetchUsers(): Promise<HubUser[]> {
  const res = await fetch(`${SALES_CORE}/api/auth/users`);
  if (!res.ok) throw new Error('Kunne ikke hente brukere');
  return res.json() as Promise<HubUser[]>;
}

export async function createUser(data: {
  name: string; email: string; pin: string;
  role: UserRole; permissions: AppPermission[]; createdBy: string;
}): Promise<HubUser> {
  const res = await fetch(`${SALES_CORE}/api/auth/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? 'Kunne ikke opprette bruker');
  }
  return res.json() as Promise<HubUser>;
}

export async function updateUser(id: string, data: Partial<Omit<HubUser, 'id'> & { pin: string }>): Promise<HubUser> {
  const res = await fetch(`${SALES_CORE}/api/auth/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Kunne ikke oppdatere bruker');
  return res.json() as Promise<HubUser>;
}

export async function deactivateUser(id: string): Promise<void> {
  const res = await fetch(`${SALES_CORE}/api/auth/users/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Kunne ikke deaktivere bruker');
}

// ── Live stats ────────────────────────────────────────────────────────────────

export interface SalesStats {
  activeOpportunities: number;
  pendingOffers: number;
  activeRounds: number;
  totalSellers: number;
}

export async function fetchStats(): Promise<SalesStats> {
  const [opps, offers, rounds, sellers] = await Promise.allSettled([
    fetch(`${SALES_CORE}/api/opportunities`).then(r => r.json()) as Promise<unknown[]>,
    fetch(`${SALES_CORE}/api/offers`).then(r => r.json()) as Promise<{ status: string }[]>,
    fetch(`${SALES_CORE}/api/sdu/rounds`).then(r => r.json()) as Promise<{ status: string }[]>,
    fetch(`${SALES_CORE}/api/sdu/sellers`).then(r => r.json()) as Promise<unknown[]>,
  ]);

  return {
    activeOpportunities: opps.status === 'fulfilled' ? (opps.value as unknown[]).length : 0,
    pendingOffers: offers.status === 'fulfilled'
      ? (offers.value as { status: string }[]).filter(o => o.status === 'sent').length : 0,
    activeRounds: rounds.status === 'fulfilled'
      ? (rounds.value as { status: string }[]).filter(r => r.status === 'active').length : 0,
    totalSellers: sellers.status === 'fulfilled' ? (sellers.value as unknown[]).length : 0,
  };
}
