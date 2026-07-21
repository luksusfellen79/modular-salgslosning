// ── Hub-session gate for dashboard og /api (superadmin only) ──
import { Request, Response, NextFunction } from 'express';

const SESSION_COOKIE = 'devcenter_hub_session';
const SESSION_MAX_AGE_SEC = 8 * 60 * 60;

interface HubSessionUser {
  role?: string;
}

export function parseHubSession(raw: string | undefined): HubSessionUser | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const role = (parsed as HubSessionUser).role;
    if (typeof role !== 'string' || !role) return null;
    return { role };
  } catch {
    return null;
  }
}

function readSessionCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const match = header.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]*)`));
  return match ? match[1] : undefined;
}

function setSessionCookie(res: Response, encodedSession: string): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodedSession}; HttpOnly; Path=/; Max-Age=${SESSION_MAX_AGE_SEC}; SameSite=Lax`,
  );
}

/** Gates dashboard + /api — kun role === 'superadmin'. */
export function requireSuperadmin(req: Request, res: Response, next: NextFunction): void {
  const fromQuery = req.query.hub_session as string | undefined;
  const fromCookie = readSessionCookie(req);
  const raw = fromQuery ?? fromCookie;

  const user = parseHubSession(raw);
  if (!user || user.role !== 'superadmin') {
    res.status(403).send('403 — Krever superadmin. Åpne Dev Center fra Hub.');
    return;
  }

  if (fromQuery) {
    setSessionCookie(res, fromQuery);
  }

  next();
}

/** Test-hjelper: superadmin hub_session token. */
export function superadminSessionToken(): string {
  return encodeURIComponent(JSON.stringify({
    id: 'test-superadmin',
    name: 'Test Superadmin',
    email: 'super@test.no',
    role: 'superadmin',
    permissions: [],
    rolleId: 'superadmin',
    jwtRoles: ['superadmin'],
    isActive: true,
    createdAt: new Date().toISOString(),
    createdBy: 'test',
  }));
}
