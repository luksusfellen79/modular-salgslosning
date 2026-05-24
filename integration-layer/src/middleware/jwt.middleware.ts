// ── JWT Middleware ────────────────────────────────────────────────────────────────
// Delt modul — brukes i alle tjenester for å validere tokens utstedt av Hub.
//
// Nå:       JWT signert med symmetrisk secret (HS256)
// Produksjon: Azure AD (asymmetrisk RS256, JWKS-endpoint)
//
// For å bytte til Azure AD: endre verifyToken() til å bruke
// jwksRsa.expressJwtSecret() mot Telenors Azure AD-tenant.

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-BYTT-MEG-I-PROD';
const JWT_EXPIRES_IN = '8h';

// ── Token-payload (Azure AD-kompatible feltnavn) ────────────────────────────

export interface JwtPayload {
  sub: string;           // bruker_id (UUID)
  name: string;          // fullt navn
  email: string;         // epost
  roles: string[];       // ['superadmin'] | ['mdu-selger'] | ['sdu-leder'] osv.
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

// ── Correlation ID middleware (legg inn tidlig i middleware-kjeden) ──────────────

export function correlationIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.correlationId =
    (req.headers['x-correlation-id'] as string) ||
    crypto.randomUUID();
  next();
}

// ── Brukseksempel ─────────────────────────────────────────────────────────────────
//
// I Hub (utstede token ved innlogging):
//   const token = utstederToken({ sub: bruker.id, name: bruker.navn, email: bruker.epost, roles: [bruker.rolle_id] });
//
// I alle tjenester (valider token):
//   import { requireAuth, requireRole } from '../middleware/jwt.middleware.js';
//   app.use('/api', requireAuth);
//   app.use('/api/admin', requireAuth, requireRole('superadmin', 'mdu-leder'));
