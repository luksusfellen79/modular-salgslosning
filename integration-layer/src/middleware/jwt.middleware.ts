// ── JWT Middleware ────────────────────────────────────────────────────────────────
// Delt modul — brukes i alle tjenester for å validere tokens utstedt av Hub.
//
// Nå:       JWT signert med symmetrisk secret (HS256)
// Produksjon: Azure AD (asymmetrisk RS256, JWKS-endpoint)

import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-BYTT-MEG-I-PROD';
const JWT_EXPIRES_IN = '8h';

// ── Salgsroller ─────────────────────────────────────────────────────────────

export const SalesRoles = {
  SUPERADMIN: 'superadmin',
  MDU_SELGER: 'mdu-selger',
  MDU_LEDER: 'mdu-leder',
  SDU_SELGER: 'sdu-selger',
  SDU_LEDER: 'sdu-leder',
} as const;

// ── Case Service-roller ─────────────────────────────────────────────────────

export const CaseRoles = {
  KUNDESERVICE: 'kundeservice',
  TEKNISK_ORDRE: 'teknisk-ordre',
  TEKNISK_AKTIVERING: 'teknisk-aktivering',
  TEKNISK_FIBER: 'teknisk-fiber',
  TEKNISK_MOBIL: 'teknisk-mobil',
  TEKNISK_FAKTURA: 'teknisk-faktura',
  CASE_ADMIN: 'case-admin',
} as const;

export type CaseRole = typeof CaseRoles[keyof typeof CaseRoles];

export const ALL_CASE_ROLES: CaseRole[] = Object.values(CaseRoles);

export const ALL_JWT_ROLES: string[] = [
  ...Object.values(SalesRoles),
  ...ALL_CASE_ROLES,
];

export function isCaseRole(role: string): role is CaseRole {
  return (ALL_CASE_ROLES as readonly string[]).includes(role);
}

export function isTekniskRole(role: string): boolean {
  return role.startsWith('teknisk-');
}

/** Map hub.rolle_id → JWT roles[] */
export function rolleIdToJwtRoles(rolleId: string): string[] {
  if (rolleId === SalesRoles.SUPERADMIN) {
    return [SalesRoles.SUPERADMIN, CaseRoles.CASE_ADMIN, ...ALL_CASE_ROLES];
  }
  if (rolleId === CaseRoles.CASE_ADMIN) {
    return [CaseRoles.CASE_ADMIN, CaseRoles.KUNDESERVICE, ...ALL_CASE_ROLES.filter((r) => r !== CaseRoles.CASE_ADMIN)];
  }
  return [rolleId];
}

export function hasAnyRole(bruker: JwtPayload, ...roles: string[]): boolean {
  return roles.some((r) => bruker.roles.includes(r));
}

export function canAccessCaseGruppe(bruker: JwtPayload, gruppe: string): boolean {
  if (hasAnyRole(bruker, SalesRoles.SUPERADMIN, CaseRoles.CASE_ADMIN, CaseRoles.KUNDESERVICE)) {
    return true;
  }
  return bruker.roles.includes(gruppe);
}

// ── Token-payload (Azure AD-kompatible feltnavn) ────────────────────────────

export interface JwtPayload {
  sub: string;           // bruker_id (UUID)
  name: string;          // fullt navn
  email: string;         // epost
  roles: string[];       // salgs- og case-roller fra hub.roller
  iat?: number;
  exp?: number;
}

// Utvid Express Request med brukerinfo fra token
declare global {
  namespace Express {
    interface Request {
      bruker?: JwtPayload;
      correlationId: string;
    }
  }
}

// ── Utsted token (Hub bruker dette ved innlogging) ────────────────────────────

export function utstederToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

// ── Valider token (alle tjenester bruker dette) ───────────────────────────────

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
}

// ── Express middleware: krev gyldig JWT ──────────────────────────────────────

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'MANGLER_TOKEN',
        message: 'Authorization: Bearer <token> er påkrevd',
      },
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    req.bruker = verifyToken(token);
    next();
  } catch (err: any) {
    const expired = err.name === 'TokenExpiredError';
    res.status(401).json({
      error: {
        code: expired ? 'TOKEN_UTLØPT' : 'UGYLDIG_TOKEN',
        message: expired ? 'Token er utløpt — logg inn på nytt' : 'Ugyldig token',
      },
    });
  }
}

// ── Express middleware: krev spesifikk rolle ───────────────────────────────────

export function requireRole(...roller: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.bruker) {
      res.status(401).json({ error: { code: 'IKKE_AUTENTISERT' } });
      return;
    }

    const harRolle = roller.some(r => req.bruker!.roles.includes(r));
    if (!harRolle) {
      res.status(403).json({
        error: {
          code: 'IKKE_AUTORISERT',
          message: `Krever en av rollene: ${roller.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
}

// ── Express middleware: krev Case Service-tilgang ──────────────────────────────

export function requireCaseRole(...roller: string[]) {
  const allowed = [...roller, CaseRoles.CASE_ADMIN, SalesRoles.SUPERADMIN];
  return requireRole(...allowed);
}

// ── Correlation ID middleware (legg inn tidlig i middleware-kjeden) ──────────────

export function correlationIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.correlationId =
    (req.headers['x-correlation-id'] as string) ||
    randomUUID();
  next();
}
