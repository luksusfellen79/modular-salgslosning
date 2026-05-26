// ── JWT — utstedelse ved innlogging (delt logikk med Integration Layer) ──
import jwt from 'jsonwebtoken';
import { rolleIdToJwtRoles } from '../db/mappers';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-BYTT-MEG-I-PROD';
const JWT_EXPIRES_IN = '8h';

export interface JwtPayload {
  sub: string;
  name: string;
  email: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

export function issueToken(input: {
  sub: string;
  name: string;
  email: string;
  rolleId: string;
}): string {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: input.sub,
    name: input.name,
    email: input.email,
    roles: rolleIdToJwtRoles(input.rolleId),
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN, algorithm: 'HS256' });
}

export function enrichAuthResponse<T extends { id: string; name: string; email: string; rolleId: string; jwtRoles: string[] }>(
  user: T,
): T & { token: string } {
  return {
    ...user,
    token: issueToken({
      sub: user.id,
      name: user.name,
      email: user.email,
      rolleId: user.rolleId,
    }),
  };
}
