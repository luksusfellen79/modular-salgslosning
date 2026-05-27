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

/** Alle gyldige hub.roller.rolle_id — brukes i admin-dropdown og validering */
export const KNOWN_HUB_ROLLE_IDS = new Set([
  'superadmin',
  'mdu-leder',
  'sdu-leder',
  'mdu-selger',
  'sdu-selger',
  'kundeservice',
  'case-admin',
  'teknisk-ordre',
  'teknisk-aktivering',
  'teknisk-fiber',
  'teknisk-mobil',
  'teknisk-faktura',
]);

export const HUB_ROLLE_OPTIONS: { id: string; label: string }[] = [
  { id: 'superadmin', label: 'Superadministrator' },
  { id: 'mdu-leder', label: 'MDU Salgsleder' },
  { id: 'sdu-leder', label: 'SDU Salgsleder' },
  { id: 'mdu-selger', label: 'MDU Selger' },
  { id: 'sdu-selger', label: 'SDU Selger (Feltsalg)' },
  { id: 'kundeservice', label: 'Kundeservice' },
  { id: 'case-admin', label: 'Case-administrator' },
  { id: 'teknisk-ordre', label: 'Teknisk — Ordre' },
  { id: 'teknisk-aktivering', label: 'Teknisk — Aktivering' },
  { id: 'teknisk-fiber', label: 'Teknisk — Fiber' },
  { id: 'teknisk-mobil', label: 'Teknisk — Mobil' },
  { id: 'teknisk-faktura', label: 'Teknisk — Faktura' },
];

const ALL_PERMISSIONS: AppPermission[] = [
  'mdu_crm', 'mdu_leder', 'sdu_crm', 'sdu_planner', 'sdu_incentives', 'case_app',
];

export function permissionsFromRolleId(rolleId: string): AppPermission[] {
  if (rolleId === 'superadmin' || rolleId === 'admin') return ALL_PERMISSIONS;
  if (rolleId === 'mdu-leder') return ['mdu_crm', 'mdu_leder'];
  if (rolleId === 'sdu-leder') return ['sdu_planner', 'sdu_incentives', 'sdu_crm'];
  if (rolleId === 'mdu-selger') return ['mdu_crm'];
  if (rolleId === 'sdu-selger') return ['sdu_crm'];
  if (rolleId === 'kundeservice' || rolleId === 'case-admin' || rolleId.startsWith('teknisk-')) {
    return ['case_app'];
  }
  return ['sdu_crm'];
}

function roleFromRolleId(rolleId: string): UserRole {
  if (rolleId === 'superadmin' || rolleId === 'admin') return 'superadmin';
  if (rolleId === 'kundeservice') return 'kundeservice';
  if (rolleId === 'case-admin') return 'case_admin';
  if (rolleId.startsWith('teknisk-')) return 'case_teknisk';
  if (rolleId === 'mdu-leder' || rolleId === 'sdu-leder') return 'salgsleder';
  if (rolleId === 'mdu-selger') return 'selger_mdu';
  return 'selger_sdu';
}

function inferRolleIdForAccess(user: Partial<HubUser>): string | undefined {
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

  return undefined;
}

function resolveRolleId(user: Partial<HubUser>, forAccess: boolean): string {
  if (!forAccess && user.rolleId && KNOWN_HUB_ROLLE_IDS.has(user.rolleId)) {
    return user.rolleId;
  }
  if (forAccess && user.rolleId && CASE_APP_ROLLE_IDS.has(user.rolleId)) {
    return user.rolleId;
  }
  if (user.rolleId && KNOWN_HUB_ROLLE_IDS.has(user.rolleId)) {
    if (forAccess && (user.rolleId === 'sdu-selger' || user.rolleId === 'sdu-leder')) {
      const inferred = inferRolleIdForAccess(user);
      if (inferred && CASE_APP_ROLLE_IDS.has(inferred)) return inferred;
    }
    return user.rolleId;
  }
  return inferRolleIdForAccess(user) ?? user.rolleId ?? 'sdu-selger';
}

/** Map Hub admin-felter → hub.rolle_id for lagring i Sales Core */
export function rolePermissionsToRolleId(
  role: UserRole,
  permissions: AppPermission[],
  existingRolleId?: string,
): string {
  if (role === 'superadmin') return 'superadmin';
  if (role === 'kundeservice') return 'kundeservice';
  if (role === 'case_admin') return 'case-admin';
  if (role === 'case_teknisk') {
    if (existingRolleId?.startsWith('teknisk-')) return existingRolleId;
    return 'teknisk-fiber';
  }
  if (role === 'selger_mdu') return 'mdu-selger';
  if (role === 'selger_sdu') return 'sdu-selger';
  if (role === 'salgsleder') {
    if (permissions.includes('mdu_leder')) return 'mdu-leder';
    return 'sdu-leder';
  }
  if (existingRolleId && KNOWN_HUB_ROLLE_IDS.has(existingRolleId)) return existingRolleId;
  return 'sdu-selger';
}

export function rolleIdLabel(rolleId: string): string {
  return HUB_ROLLE_OPTIONS.find((o) => o.id === rolleId)?.label ?? rolleId;
}

export function hubFieldsFromRolleId(rolleId: string): { role: UserRole; permissions: AppPermission[] } {
  return { role: roleFromRolleId(rolleId), permissions: permissionsFromRolleId(rolleId) };
}

/** Normaliser bruker — forAccess=true for innlogging/dashboard, false for admin (stoler på DB) */
export function normalizeHubUser(user: LoginResult | HubUser, forAccess = true): HubUser {
  const rolleId = resolveRolleId(user, forAccess);
  const jwtRoles = user.jwtRoles?.length ? user.jwtRoles : [rolleId];
  const permissions = permissionsFromRolleId(rolleId);

  return {
    ...user,
    rolleId,
    jwtRoles,
    permissions,
    role: roleFromRolleId(rolleId),
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
  const users = await res.json() as HubUser[];
  return users.map((u) => normalizeHubUser(u, false));
}

export async function createUser(data: {
  name: string; email: string; pin: string;
  rolleId: string;
  createdBy: string;
}): Promise<HubUser> {
  if (!KNOWN_HUB_ROLLE_IDS.has(data.rolleId)) {
    throw new Error(`Ugyldig rolleId: ${data.rolleId}`);
  }
  const { role, permissions } = hubFieldsFromRolleId(data.rolleId);
  const res = await fetch(`${SALES_CORE}/api/auth/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, role, permissions, rolleId: data.rolleId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? 'Kunne ikke opprette bruker');
  }
  const user = await res.json() as HubUser;
  return normalizeHubUser(user, false);
}

export async function updateUser(
  id: string,
  data: Partial<Omit<HubUser, 'id'> & { pin: string; rolleId?: string }>,
): Promise<HubUser> {
  if (data.rolleId !== undefined && !KNOWN_HUB_ROLLE_IDS.has(data.rolleId)) {
    throw new Error(`Ugyldig rolleId: ${data.rolleId}`);
  }
  const body: Record<string, unknown> = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.email !== undefined) body.email = data.email;
  if (data.pin !== undefined) body.pin = data.pin;
  if (data.isActive !== undefined) body.isActive = data.isActive;
  if (data.rolleId !== undefined) body.rolleId = data.rolleId;

  const res = await fetch(`${SALES_CORE}/api/auth/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? 'Kunne ikke oppdatere bruker');
  }
  const user = await res.json() as HubUser | null;
  if (!user?.id) throw new Error('Kunne ikke oppdatere bruker');
  return normalizeHubUser(user, false);
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
