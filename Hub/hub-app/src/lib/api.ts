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

const CASE_APP_ROLLE_IDS = new Set([
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

function roleFromRolleId(rolleId: string): UserRole {
  if (rolleId === 'superadmin' || rolleId === 'admin') return 'superadmin';
  if (rolleId === 'kundeservice') return 'kundeservice';
  if (rolleId === 'case-admin') return 'case_admin';
  if (rolleId.startsWith('teknisk-')) return 'case_teknisk';
  if (rolleId === 'mdu-leder' || rolleId === 'sdu-leder') return 'salgsleder';
  if (rolleId === 'mdu-selger') return 'selger_mdu';
  return 'selger_sdu';
}

function inferRolleId(user: Partial<HubUser>): string | undefined {
  if (user.rolleId && CASE_APP_ROLLE_IDS.has(user.rolleId)) return user.rolleId;
  if (user.rolleId === 'superadmin' || user.rolleId === 'mdu-leder' || user.rolleId === 'sdu-leder'
    || user.rolleId === 'mdu-selger' || user.rolleId === 'sdu-selger') {
    return user.rolleId;
  }

  const role = user.role;
  if (role === 'superadmin') return 'superadmin';
  if (role === 'kundeservice') return 'kundeservice';
  if (role === 'case_admin') return 'case-admin';
  if (role === 'case_teknisk') {
    const teknisk = user.jwtRoles?.find((r) => r.startsWith('teknisk-'));
    if (teknisk) return teknisk;
  }

  if (user.jwtRoles?.includes('superadmin') || user.jwtRoles?.includes('admin')) return 'superadmin';
  if (user.jwtRoles?.includes('case-admin')) return 'case-admin';
  if (user.jwtRoles?.includes('kundeservice')) return 'kundeservice';
  const teknisk = user.jwtRoles?.find((r) => r.startsWith('teknisk-'));
  if (teknisk) return teknisk;

  const email = user.email?.toLowerCase() ?? '';
  if (email.includes('kundeservice')) return 'kundeservice';
  if (email.includes('tom.fiber')) return 'teknisk-fiber';

  const name = user.name?.toLowerCase() ?? '';
  if (name.includes('kundeservice')) return 'kundeservice';

  return user.rolleId;
}

/** Normaliser bruker fra login/API — fyll inn rolleId og permissions for eldre API-responser */
export function normalizeHubUser(user: LoginResult | HubUser): HubUser {
  const rolleId = inferRolleId(user) ?? user.rolleId ?? 'sdu-selger';
  const jwtRoles = user.jwtRoles?.length ? user.jwtRoles : [rolleId];

  let permissions = user.permissions ?? [];
  if (CASE_APP_ROLLE_IDS.has(rolleId) && !permissions.includes('case_app')) {
    permissions = [...permissions, 'case_app'];
  }
  if (rolleId === 'superadmin' || rolleId === 'admin') {
    permissions = [
      'mdu_crm', 'mdu_leder', 'sdu_crm', 'sdu_planner', 'sdu_incentives', 'case_app',
    ];
  }

  return {
    ...user,
    rolleId,
    jwtRoles,
    permissions,
    role: user.role ?? roleFromRolleId(rolleId),
  };
}

/** Sjekk apptilgang — permissions, rolleId, jwtRoles eller role-felt */
export function userHasAppPermission(user: HubUser, permission: AppPermission): boolean {
  const normalized = normalizeHubUser(user);
  if (normalized.permissions.includes(permission)) return true;

  if (permission === 'case_app') {
    if (CASE_APP_ROLLE_IDS.has(normalized.rolleId)) return true;
    if (normalized.jwtRoles.some((r) => CASE_APP_ROLLE_IDS.has(r))) return true;
    if (['superadmin', 'kundeservice', 'case_admin', 'case_teknisk'].includes(normalized.role)) {
      return true;
    }
  }

  return false;
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
  const result = await res.json() as LoginResult;
  return { ...normalizeHubUser(result), token: result.token };
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
