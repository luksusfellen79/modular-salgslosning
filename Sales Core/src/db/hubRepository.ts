// ── Hub brukere og sessions (PostgreSQL) ──
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { getPool } from './pool';
import {
  brukerRowToHubUser,
  roleToRolleId,
  rolleIdToHubFields,
} from './mappers';
import { AppPermission, HubUser, UserRole } from '../types';

const BCRYPT_ROUNDS = 10;
const SESSION_HOURS = 24;

export async function ensureHubRoles(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    INSERT INTO hub.roller (rolle_id, beskrivelse) VALUES
      ('superadmin', 'Superadministrator med full tilgang'),
      ('mdu-selger', 'MDU-selger, tilgang til MDU CRM'),
      ('mdu-leder', 'MDU-salgsleder, tilgang til MDU Leder og War Room'),
      ('sdu-selger', 'SDU-feltsalgsselger, tilgang til SDU CRM'),
      ('sdu-leder', 'SDU-salgsleder, tilgang til SDU Planner')
    ON CONFLICT (rolle_id) DO NOTHING
  `);
}

export async function listHubUsers(): Promise<Omit<HubUser, 'pin'>[]> {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT bruker_id, navn, epost, rolle_id, aktiv, opprettet, sist_innlogget
    FROM hub.brukere
    ORDER BY navn
  `);
  return rows.map(brukerRowToHubUser);
}

export async function findHubUserByName(name: string): Promise<(Omit<HubUser, 'pin'> & { pinHash: string }) | null> {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT bruker_id, navn, epost, rolle_id, aktiv, opprettet, sist_innlogget, pin_hash
    FROM hub.brukere
    WHERE LOWER(navn) = LOWER($1)
    LIMIT 1
  `, [name.trim()]);
  if (!rows.length) return null;
  const row = rows[0];
  return { ...brukerRowToHubUser(row), pinHash: row.pin_hash as string };
}

export async function findHubUserById(id: string): Promise<Omit<HubUser, 'pin'> | null> {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT bruker_id, navn, epost, rolle_id, aktiv, opprettet, sist_innlogget
    FROM hub.brukere
    WHERE bruker_id = $1
  `, [id]);
  if (!rows.length) return null;
  return brukerRowToHubUser(rows[0]);
}

export async function createHubUser(input: {
  id?: string;
  name: string;
  email?: string;
  pin: string;
  role: UserRole;
  permissions?: AppPermission[];
  isActive?: boolean;
  createdBy?: string;
}): Promise<Omit<HubUser, 'pin'>> {
  const pool = getPool();
  const brukerId = input.id && !input.id.startsWith('usr-') ? input.id : randomUUID();
  const pinHash = await bcrypt.hash(input.pin, BCRYPT_ROUNDS);
  const rolleId = roleToRolleId(input.role, input.permissions);

  await pool.query(`
    INSERT INTO hub.brukere (bruker_id, navn, epost, pin_hash, rolle_id, aktiv)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [brukerId, input.name.trim(), input.email ?? null, pinHash, rolleId, input.isActive ?? true]);

  const user = await findHubUserById(brukerId);
  if (!user) throw new Error('Failed to create hub user');
  return user;
}

export async function updateHubUser(
  id: string,
  patch: Partial<Pick<HubUser, 'name' | 'email' | 'role' | 'permissions' | 'isActive'>> & { pin?: string },
): Promise<Omit<HubUser, 'pin'> | null> {
  const pool = getPool();
  const existing = await findHubUserById(id);
  if (!existing) return null;

  const name = patch.name ?? existing.name;
  const email = patch.email ?? existing.email;
  const isActive = patch.isActive ?? existing.isActive;
  const rolleId = patch.role
    ? roleToRolleId(patch.role, patch.permissions ?? existing.permissions)
    : undefined;

  if (patch.pin) {
    const pinHash = await bcrypt.hash(patch.pin, BCRYPT_ROUNDS);
    await pool.query(`
      UPDATE hub.brukere
      SET navn = $2, epost = $3, aktiv = $4, pin_hash = $5${rolleId ? ', rolle_id = $6' : ''}
      WHERE bruker_id = $1
    `, rolleId
      ? [id, name, email || null, isActive, pinHash, rolleId]
      : [id, name, email || null, isActive, pinHash]);
  } else if (rolleId) {
    await pool.query(`
      UPDATE hub.brukere SET navn = $2, epost = $3, aktiv = $4, rolle_id = $5 WHERE bruker_id = $1
    `, [id, name, email || null, isActive, rolleId]);
  } else {
    await pool.query(`
      UPDATE hub.brukere SET navn = $2, epost = $3, aktiv = $4 WHERE bruker_id = $1
    `, [id, name, email || null, isActive]);
  }

  return findHubUserById(id);
}

export async function verifyHubLogin(name: string, pin: string): Promise<Omit<HubUser, 'pin'> | null> {
  const user = await findHubUserByName(name);
  if (!user || !user.isActive) return null;
  const ok = await bcrypt.compare(pin, user.pinHash);
  if (!ok) return null;

  const pool = getPool();
  const token = randomUUID();
  const expires = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);

  await pool.query(`
    INSERT INTO hub.sessions (bruker_id, token, utløper) VALUES ($1, $2, $3)
  `, [user.id, token, expires]);

  await pool.query(`
    UPDATE hub.brukere SET sist_innlogget = now() WHERE bruker_id = $1
  `, [user.id]);

  const { pinHash: _pinHash, ...safeUser } = user;
  return safeUser;
}

export async function upsertHubUserSeed(input: {
  id: string;
  name: string;
  email: string;
  pin: string;
  rolleId: string;
}): Promise<void> {
  const pool = getPool();
  const pinHash = await bcrypt.hash(input.pin, BCRYPT_ROUNDS);
  try {
    await pool.query(`
      INSERT INTO hub.brukere (bruker_id, navn, epost, pin_hash, rolle_id, aktiv)
      VALUES ($1, $2, $3, $4, $5, true)
      ON CONFLICT (bruker_id) DO UPDATE SET
        navn = EXCLUDED.navn,
        epost = EXCLUDED.epost,
        pin_hash = EXCLUDED.pin_hash,
        rolle_id = EXCLUDED.rolle_id,
        aktiv = true
    `, [input.id, input.name, input.email, pinHash, input.rolleId]);
  } catch {
    await pool.query(`
      UPDATE hub.brukere SET navn = $2, pin_hash = $3, rolle_id = $4, aktiv = true
      WHERE epost = $1
    `, [input.email, input.name, pinHash, input.rolleId]);
  }
}

export { rolleIdToHubFields, roleToRolleId };
