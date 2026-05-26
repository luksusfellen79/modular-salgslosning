// ── Async storage facade (PostgreSQL eller JSON-fallback) ──
import { usePostgres } from '../db/pool';
import * as hubRepo from '../db/hubRepository';
import * as mduRepo from '../db/mduRepository';
import * as sduRepo from '../db/sduRepository';
import {
  readOpportunities as readOpportunitiesJson,
  writeOpportunities as writeOpportunitiesJson,
  readRounds as readRoundsJson,
  writeRounds as writeRoundsJson,
  readSellers as readSellersJson,
  writeSellers as writeSellersJson,
  readUsers as readUsersJson,
  writeUsers as writeUsersJson,
} from './index';
import { HubUser, Opportunity, Round, RoundUnit, Seller } from '../types';
import { roleToRolleId, rolleIdToJwtRoles } from '../db/mappers';

export async function getOpportunities(): Promise<Opportunity[]> {
  if (usePostgres()) return mduRepo.listMduDeals();
  return readOpportunitiesJson();
}

export async function getOpportunityById(id: string): Promise<Opportunity | null> {
  if (usePostgres()) return mduRepo.getMduDealById(id);
  return readOpportunitiesJson().find((o) => o.id === id) ?? null;
}

export async function createOpportunity(opp: Opportunity): Promise<Opportunity> {
  if (usePostgres()) return mduRepo.createMduDeal(opp);
  const all = readOpportunitiesJson();
  writeOpportunitiesJson([...all, opp]);
  return opp;
}

export async function updateOpportunity(id: string, patch: Partial<Opportunity>): Promise<Opportunity | null> {
  if (usePostgres()) return mduRepo.updateMduDeal(id, patch);
  const all = readOpportunitiesJson();
  const existing = all.find((o) => o.id === id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
  writeOpportunitiesJson(all.map((o) => (o.id === id ? updated : o)));
  return updated;
}

export async function getRounds(): Promise<Round[]> {
  if (usePostgres()) return sduRepo.listSduRounds();
  return readRoundsJson();
}

export async function getRoundById(id: string): Promise<Round | null> {
  if (usePostgres()) return sduRepo.getSduRoundById(id);
  return readRoundsJson().find((r) => r.id === id) ?? null;
}

export async function createRound(round: Round): Promise<Round> {
  if (usePostgres()) return sduRepo.createSduRound(round);
  const all = readRoundsJson();
  writeRoundsJson([...all, round]);
  return round;
}

export async function updateRound(id: string, patch: Partial<Round>): Promise<Round | null> {
  if (usePostgres()) return sduRepo.updateSduRound(id, patch);
  const all = readRoundsJson();
  const existing = all.find((r) => r.id === id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
  writeRoundsJson(all.map((r) => (r.id === id ? updated : r)));
  return updated;
}

export async function updateRoundUnit(
  roundId: string,
  unitId: string,
  patch: Partial<RoundUnit>,
): Promise<Round | null> {
  if (usePostgres()) return sduRepo.updateSduRoundUnit(roundId, unitId, patch);
  const all = readRoundsJson();
  const existing = all.find((r) => r.id === roundId);
  if (!existing) return null;
  const unitIndex = existing.units.findIndex((u) => u.unitId === unitId);
  if (unitIndex === -1) return null;
  const updatedUnit = { ...existing.units[unitIndex], ...patch };
  const updatedUnits = [...existing.units];
  updatedUnits[unitIndex] = updatedUnit;
  const updated = { ...existing, units: updatedUnits, updatedAt: new Date().toISOString() };
  writeRoundsJson(all.map((r) => (r.id === roundId ? updated : r)));
  return updated;
}

export async function getSellers(): Promise<Seller[]> {
  if (usePostgres()) {
    const sellers = await sduRepo.listSduSellers();
    return sellers.map((s) => ({
      ...s,
      role: 'seller' as const,
      createdAt: new Date().toISOString(),
    }));
  }
  return readSellersJson();
}

export async function createSeller(seller: Seller): Promise<Seller> {
  if (usePostgres()) {
    await sduRepo.createSduSeller(seller);
    return seller;
  }
  const all = readSellersJson();
  writeSellersJson([...all, seller]);
  return seller;
}

export async function updateSeller(id: string, patch: Partial<Seller>): Promise<Seller | null> {
  if (usePostgres()) {
    const sellers = await getSellers();
    const existing = sellers.find((s) => s.id === id);
    if (!existing) return null;
    return { ...existing, ...patch };
  }
  const all = readSellersJson();
  const existing = all.find((s) => s.id === id);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  writeSellersJson(all.map((s) => (s.id === id ? updated : s)));
  return updated;
}

export async function getUsers(): Promise<HubUser[]> {
  if (usePostgres()) {
    const users = await hubRepo.listHubUsers();
    return users.map((u) => ({ ...u, pin: '' }));
  }
  return readUsersJson();
}

export async function loginUser(name: string, pin: string): Promise<Omit<HubUser, 'pin'> | null> {
  if (usePostgres()) return hubRepo.verifyHubLogin(name, pin);
  const users = readUsersJson();
  const user = users.find(
    (u) => u.name.toLowerCase() === name.toLowerCase() && u.pin === pin && u.isActive,
  );
  if (!user) return null;
  const updated = { ...user, lastLoginAt: new Date().toISOString() };
  writeUsersJson(users.map((u) => (u.id === user.id ? updated : u)));
  const { pin: _pin, ...safe } = updated;
  const rolleId = safe.rolleId ?? roleToRolleId(safe.role, safe.permissions);
  return {
    ...safe,
    rolleId,
    jwtRoles: safe.jwtRoles ?? rolleIdToJwtRoles(rolleId),
  };
}

export async function createUser(user: HubUser): Promise<Omit<HubUser, 'pin'>> {
  if (usePostgres()) {
    return hubRepo.createHubUser({
      id: user.id.startsWith('usr-') ? undefined : user.id,
      name: user.name,
      email: user.email,
      pin: user.pin,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
      createdBy: user.createdBy,
    });
  }
  const all = readUsersJson();
  writeUsersJson([...all, user]);
  const { pin: _pin, ...safe } = user;
  return safe;
}

export async function updateUser(id: string, patch: Partial<HubUser>): Promise<Omit<HubUser, 'pin'> | null> {
  if (usePostgres()) {
    return hubRepo.updateHubUser(id, patch);
  }
  const all = readUsersJson();
  const existing = all.find((u) => u.id === id);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  writeUsersJson(all.map((u) => (u.id === id ? updated : u)));
  const { pin: _pin, ...safe } = updated;
  return safe;
}

export async function deactivateUser(id: string): Promise<boolean> {
  if (usePostgres()) {
    const result = await hubRepo.updateHubUser(id, { isActive: false });
    return result !== null;
  }
  const all = readUsersJson();
  const existing = all.find((u) => u.id === id);
  if (!existing) return false;
  writeUsersJson(all.map((u) => (u.id === id ? { ...u, isActive: false } : u)));
  return true;
}

export async function findUserByEmail(email: string): Promise<HubUser | undefined> {
  const users = await getUsers();
  return users.find((u) => u.email === email);
}
