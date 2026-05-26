// ── Mapping mellom API-typer og PostgreSQL-skjema ──
import { v5 as uuidv5 } from 'uuid';
import {
  AppPermission,
  HubUser,
  Opportunity,
  OpportunityStage,
  Round,
  RoundStatus,
  RoundUnit,
  UserRole,
  WarRoomStatus,
} from '../types';

const LEGACY_OPP_NS = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
const LEGACY_RND_NS = '6ba7b812-9dad-11d1-80b4-00c04fd430c8';

export const SEED_USER_IDS = {
  jorn: 'a0000001-0000-4000-8000-000000000001',
  per: 'a0000002-0000-4000-8000-000000000002',
  nina: 'a0000003-0000-4000-8000-000000000003',
  kari: 'a0000004-0000-4000-8000-000000000004',
  ole: 'a0000005-0000-4000-8000-000000000005',
  lise: 'a0000006-0000-4000-8000-000000000006',
  erik: 'a0000007-0000-4000-8000-000000000007',
  ingrid: 'a0000008-0000-4000-8000-000000000008',
  anna: 'a0000009-0000-4000-8000-000000000009',
  tom: 'a0000010-0000-4000-8000-000000000010',
} as const;

export const CASE_ROLLE_IDS = [
  'kundeservice',
  'teknisk-ordre',
  'teknisk-aktivering',
  'teknisk-fiber',
  'teknisk-mobil',
  'teknisk-faktura',
  'case-admin',
] as const;

export type CaseRolleId = typeof CASE_ROLLE_IDS[number];

const ALL_PERMISSIONS: AppPermission[] = [
  'mdu_crm', 'mdu_leder', 'sdu_crm', 'sdu_planner', 'sdu_incentives', 'case_app',
];

export function isCaseRolleId(rolleId: string): rolleId is CaseRolleId {
  return (CASE_ROLLE_IDS as readonly string[]).includes(rolleId);
}

export function isTekniskRolleId(rolleId: string): boolean {
  return rolleId.startsWith('teknisk-');
}

/** Map hub.rolle_id → JWT roles[] (Azure AD-kompatibel) */
export function rolleIdToJwtRoles(rolleId: string): string[] {
  if (rolleId === 'superadmin') {
    return ['superadmin', 'case-admin', ...CASE_ROLLE_IDS];
  }
  if (rolleId === 'case-admin') {
    return ['case-admin', 'kundeservice', ...CASE_ROLLE_IDS.filter((r) => r !== 'case-admin')];
  }
  return [rolleId];
}

export function roleToRolleId(role: UserRole, permissions?: AppPermission[]): string {
  if (role === 'superadmin') return 'superadmin';
  if (role === 'kundeservice') return 'kundeservice';
  if (role === 'case_admin') return 'case-admin';
  if (role === 'selger_mdu') return 'mdu-selger';
  if (role === 'selger_sdu') return 'sdu-selger';
  if (permissions?.includes('mdu_leder')) return 'mdu-leder';
  return 'sdu-leder';
}

export function rolleIdToHubFields(rolleId: string): { role: UserRole; permissions: AppPermission[] } {
  switch (rolleId) {
    case 'superadmin':
      return { role: 'superadmin', permissions: ALL_PERMISSIONS };
    case 'mdu-leder':
      return { role: 'salgsleder', permissions: ['mdu_crm', 'mdu_leder'] };
    case 'sdu-leder':
      return { role: 'salgsleder', permissions: ['sdu_planner', 'sdu_incentives', 'sdu_crm'] };
    case 'mdu-selger':
      return { role: 'selger_mdu', permissions: ['mdu_crm'] };
    case 'sdu-selger':
      return { role: 'selger_sdu', permissions: ['sdu_crm'] };
    case 'kundeservice':
      return { role: 'kundeservice', permissions: ['case_app'] };
    case 'case-admin':
      return { role: 'case_admin', permissions: ['case_app'] };
    case 'teknisk-ordre':
    case 'teknisk-aktivering':
    case 'teknisk-fiber':
    case 'teknisk-mobil':
    case 'teknisk-faktura':
      return { role: 'case_teknisk', permissions: ['case_app'] };
    default:
      return { role: 'selger_sdu', permissions: ['sdu_crm'] };
  }
}

export function legacyOppId(id: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  return uuidv5(id, LEGACY_OPP_NS);
}

export function legacyRndId(id: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  return uuidv5(id, LEGACY_RND_NS);
}

interface DealMeta {
  legacyId?: string;
  contactName?: string;
  contactEmail?: string;
  salesRepName?: string;
  warRoomStatus?: WarRoomStatus;
  warRoomNote?: string;
  warRoomAt?: string;
}

function encodeDealMeta(meta: DealMeta, notes?: string): string {
  const lines: string[] = [];
  if (meta.legacyId) lines.push(`legacyId:${meta.legacyId}`);
  if (meta.contactName) lines.push(`contactName:${meta.contactName}`);
  if (meta.contactEmail) lines.push(`contactEmail:${meta.contactEmail}`);
  if (meta.salesRepName) lines.push(`salesRepName:${meta.salesRepName}`);
  if (meta.warRoomStatus) lines.push(`warRoomStatus:${meta.warRoomStatus}`);
  if (meta.warRoomNote) lines.push(`warRoomNote:${meta.warRoomNote}`);
  if (meta.warRoomAt) lines.push(`warRoomAt:${meta.warRoomAt}`);
  if (notes?.trim()) lines.push('', notes.trim());
  return lines.join('\n');
}

function decodeDealMeta(notater: string | null): DealMeta & { notes?: string } {
  const meta: DealMeta & { notes?: string } = {};
  if (!notater) return meta;
  const lines = notater.split('\n');
  const noteLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('legacyId:')) meta.legacyId = line.slice('legacyId:'.length);
    else if (line.startsWith('contactName:')) meta.contactName = line.slice('contactName:'.length);
    else if (line.startsWith('contactEmail:')) meta.contactEmail = line.slice('contactEmail:'.length);
    else if (line.startsWith('salesRepName:')) meta.salesRepName = line.slice('salesRepName:'.length);
    else if (line.startsWith('warRoomStatus:')) meta.warRoomStatus = line.slice('warRoomStatus:'.length) as WarRoomStatus;
    else if (line.startsWith('warRoomNote:')) meta.warRoomNote = line.slice('warRoomNote:'.length);
    else if (line.startsWith('warRoomAt:')) meta.warRoomAt = line.slice('warRoomAt:'.length);
    else noteLines.push(line);
  }
  const notes = noteLines.join('\n').trim();
  if (notes) meta.notes = notes;
  return meta;
}

const STAGE_TO_DEAL: Record<OpportunityStage, string> = {
  prospect: 'lead',
  qualification: 'kontaktet',
  proposal: 'tilbud-sendt',
  negotiation: 'forhandling',
  'closed-won': 'vunnet',
  'closed-lost': 'tapt',
};

const DEAL_TO_STAGE: Record<string, OpportunityStage> = {
  lead: 'prospect',
  kontaktet: 'qualification',
  befaring: 'qualification',
  'tilbud-sendt': 'proposal',
  forhandling: 'negotiation',
  'war-room': 'negotiation',
  'war-room-godkjent': 'negotiation',
  'war-room-avvist': 'negotiation',
  vunnet: 'closed-won',
  tapt: 'closed-lost',
};

export function opportunityToDealRow(opp: Opportunity, selgerId: string): {
  dealId: string;
  byggId: string;
  adresse: string;
  antallEnheter: number;
  status: string;
  selgerId: string;
  verdiKr: number;
  forventetClose: string;
  notater: string;
  opprettet: string;
  sistOppdatert: string;
} {
  let status = STAGE_TO_DEAL[opp.stage];
  if (opp.warRoomStatus === 'pending') status = 'war-room';
  if (opp.warRoomStatus === 'approved') status = 'war-room-godkjent';
  if (opp.warRoomStatus === 'rejected') status = 'war-room-avvist';

  return {
    dealId: legacyOppId(opp.id),
    byggId: `bygg-${opp.accountName.toLowerCase().replace(/\s+/g, '-').slice(0, 40)}`,
    adresse: opp.accountName,
    antallEnheter: opp.units,
    status,
    selgerId,
    verdiKr: opp.estimatedAnnualValue,
    forventetClose: opp.closeDate,
    notater: encodeDealMeta({
      legacyId: opp.id,
      contactName: opp.contactName,
      contactEmail: opp.contactEmail,
      salesRepName: opp.salesRepName,
      warRoomStatus: opp.warRoomStatus,
      warRoomNote: opp.warRoomNote,
      warRoomAt: opp.warRoomAt,
    }, opp.notes),
    opprettet: opp.createdAt,
    sistOppdatert: opp.updatedAt,
  };
}

export function dealRowToOpportunity(row: {
  deal_id: string;
  bygg_id: string;
  adresse: string;
  antall_enheter: number;
  status: string;
  verdi_kr: string | number | null;
  forventet_close: Date | string | null;
  notater: string | null;
  opprettet: Date | string;
  sist_oppdatert: Date | string;
}): Opportunity {
  const meta = decodeDealMeta(row.notater);
  let warRoomStatus = meta.warRoomStatus;
  if (!warRoomStatus) {
    if (row.status === 'war-room') warRoomStatus = 'pending';
    if (row.status === 'war-room-godkjent') warRoomStatus = 'approved';
    if (row.status === 'war-room-avvist') warRoomStatus = 'rejected';
  }

  return {
    id: meta.legacyId ?? row.deal_id,
    name: row.adresse,
    accountName: row.adresse,
    contactName: meta.contactName ?? '',
    contactEmail: meta.contactEmail ?? '',
    stage: DEAL_TO_STAGE[row.status] ?? 'prospect',
    closeDate: row.forventet_close
      ? new Date(row.forventet_close).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    estimatedAnnualValue: Number(row.verdi_kr ?? 0),
    units: row.antall_enheter,
    notes: meta.notes,
    salesRepName: meta.salesRepName,
    warRoomStatus,
    warRoomNote: meta.warRoomNote,
    warRoomAt: meta.warRoomAt,
    createdAt: new Date(row.opprettet).toISOString(),
    updatedAt: new Date(row.sist_oppdatert).toISOString(),
  };
}

export function roundStatusToDb(status: RoundStatus): string {
  const map: Record<RoundStatus, string> = {
    draft: 'planlagt',
    active: 'aktiv',
    completed: 'fullført',
  };
  return map[status];
}

export function roundStatusFromDb(status: string): RoundStatus {
  const map: Record<string, RoundStatus> = {
    planlagt: 'draft',
    aktiv: 'active',
    fullført: 'completed',
  };
  return map[status] ?? 'draft';
}

export function visitStatusToDb(status: RoundUnit['visitStatus']): string {
  const map: Record<RoundUnit['visitStatus'], string> = {
    pending: 'ikke-besøkt',
    visited: 'besøkt',
    not_home: 'ikke-hjemme',
    sold: 'solgt',
    no_interest: 'ikke-interessert',
  };
  return map[status];
}

export function visitStatusFromDb(status: string): RoundUnit['visitStatus'] {
  const map: Record<string, RoundUnit['visitStatus']> = {
    'ikke-besøkt': 'pending',
    besøkt: 'visited',
    'ikke-hjemme': 'not_home',
    solgt: 'sold',
    'ikke-interessert': 'no_interest',
  };
  return map[status] ?? 'pending';
}

export function brukerRowToHubUser(row: {
  bruker_id: string;
  navn: string;
  epost: string | null;
  rolle_id: string;
  aktiv: boolean;
  opprettet: Date | string;
  sist_innlogget: Date | string | null;
}): Omit<HubUser, 'pin'> {
  const { role, permissions } = rolleIdToHubFields(row.rolle_id);
  return {
    id: row.bruker_id,
    name: row.navn,
    email: row.epost ?? '',
    role,
    permissions,
    rolleId: row.rolle_id,
    jwtRoles: rolleIdToJwtRoles(row.rolle_id),
    isActive: row.aktiv,
    lastLoginAt: row.sist_innlogget ? new Date(row.sist_innlogget).toISOString() : undefined,
    createdAt: new Date(row.opprettet).toISOString(),
    createdBy: 'system',
  };
}
