// ── In-memory store for tester uten DATABASE_URL ──
import { randomUUID } from 'crypto';
import { Case, CaseEvent, CaseType, CreateCaseInput, RoutingRule, SakStatus } from '../types';

let seq = 1;
const cases = new Map<string, Case>();
const events = new Map<string, CaseEvent[]>();

const DEFAULT_TYPES: CaseType[] = [
  { typeKode: 'ORDER_FEIL', navn: 'Ordrefeil', beskrivelse: 'Ordrefeil', slaTimer: 8, slaAktiv: true, aktiv: true },
  { typeKode: 'AKTIVERING_FEIL', navn: 'Aktiveringsfeil', beskrivelse: 'Aktiveringsfeil', slaTimer: 4, slaAktiv: true, aktiv: true },
  { typeKode: 'FIBER_FEIL', navn: 'Fiberfeil', beskrivelse: 'Fiberfeil', slaTimer: 8, slaAktiv: true, aktiv: true },
  { typeKode: 'MOBILFEIL', navn: 'Mobilfeil', beskrivelse: 'Mobilfeil', slaTimer: 8, slaAktiv: true, aktiv: true },
  { typeKode: 'FAKTURA_FEIL', navn: 'Fakturafeil', beskrivelse: 'Fakturafeil', slaTimer: 24, slaAktiv: true, aktiv: true },
  { typeKode: 'TV_FEIL', navn: 'TV-feil', beskrivelse: 'TV-feil', slaTimer: 8, slaAktiv: true, aktiv: true },
  { typeKode: 'KUNDEHENVENDELSE', navn: 'Kundehenvendelse', beskrivelse: 'Kundehenvendelse', slaTimer: 24, slaAktiv: false, aktiv: true },
];

const DEFAULT_RULES: RoutingRule[] = DEFAULT_TYPES.map((t) => ({
  regelId: randomUUID(),
  typeKode: t.typeKode,
  malgruppe: t.typeKode === 'KUNDEHENVENDELSE' ? 'kundeservice' : `teknisk-${t.typeKode.toLowerCase().replace('_feil', '').replace('mobilfeil', 'mobil').replace('faktura_feil', 'faktura')}`,
  prioritet: 10,
  autoTildel: true,
  aktiv: true,
}));

// Fix routing groups to match seed
DEFAULT_RULES.find((r) => r.typeKode === 'ORDER_FEIL')!.malgruppe = 'teknisk-ordre';
DEFAULT_RULES.find((r) => r.typeKode === 'AKTIVERING_FEIL')!.malgruppe = 'teknisk-aktivering';
DEFAULT_RULES.find((r) => r.typeKode === 'FIBER_FEIL')!.malgruppe = 'teknisk-fiber';
DEFAULT_RULES.find((r) => r.typeKode === 'MOBILFEIL')!.malgruppe = 'teknisk-mobil';
DEFAULT_RULES.find((r) => r.typeKode === 'FAKTURA_FEIL')!.malgruppe = 'teknisk-faktura';
DEFAULT_RULES.find((r) => r.typeKode === 'TV_FEIL')!.malgruppe = 'teknisk-aktivering';
DEFAULT_RULES.find((r) => r.typeKode === 'KUNDEHENVENDELSE')!.malgruppe = 'kundeservice';

export function memoryReset(): void {
  cases.clear();
  events.clear();
  seq = 1;
}

export function memoryListTypes(): CaseType[] {
  return [...DEFAULT_TYPES];
}

export function memoryGetType(typeKode: string): CaseType | null {
  return DEFAULT_TYPES.find((t) => t.typeKode === typeKode) ?? null;
}

export function memoryListRules(): RoutingRule[] {
  return [...DEFAULT_RULES];
}

export function memoryGetRule(typeKode: string): RoutingRule | null {
  return DEFAULT_RULES.find((r) => r.typeKode === typeKode && r.aktiv) ?? null;
}

export function memoryInsertCase(input: CreateCaseInput & {
  tildeltGruppe?: string;
  status: SakStatus;
  slaFrist?: string;
}): Case {
  const id = randomUUID();
  const now = new Date().toISOString();
  const type = memoryGetType(input.typeKode);
  const saksnummer = `CS-${new Date().getFullYear()}-${String(seq++).padStart(5, '0')}`;
  const c: Case = {
    id,
    saksnummer,
    typeKode: input.typeKode,
    typeNavn: type?.navn,
    status: input.status,
    prioritet: input.prioritet ?? 'normal',
    tittel: input.tittel,
    beskrivelse: input.beskrivelse,
    kundeId: input.kundeId,
    kundeNavn: input.kundeNavn,
    kundeEpost: input.kundeEpost,
    kundeTelefon: input.kundeTelefon,
    bestillerId: input.bestillerId,
    tildeltGruppe: input.tildeltGruppe,
    opprettetAv: input.opprettetAv,
    opprettet: now,
    sistOppdatert: now,
    slaFrist: input.slaFrist,
    slaBrudd: false,
    slaAdvarselSendt: false,
    kilde: input.kilde ?? 'manual',
    kildeRef: input.kildeRef,
    metadata: input.metadata ?? {},
  };
  cases.set(id, c);
  cases.set(saksnummer, c);
  events.set(id, []);
  return c;
}

export function memoryUpdateCase(id: string, patch: Partial<Case>): Case | null {
  const existing = memoryFindCase(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id: existing.id, sistOppdatert: new Date().toISOString() };
  cases.set(existing.id, updated);
  cases.set(existing.saksnummer, updated);
  return updated;
}

export function memoryFindCase(idOrNummer: string): Case | null {
  return cases.get(idOrNummer) ?? null;
}

export function memoryListCases(filters: {
  status?: SakStatus;
  gruppe?: string;
  typeKode?: string;
  tildeltBrukerId?: string;
  q?: string;
  limit?: number;
  offset?: number;
}): Case[] {
  const seen = new Set<string>();
  let rows = [...cases.values()].filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
  if (filters.status) rows = rows.filter((c) => c.status === filters.status);
  if (filters.gruppe) rows = rows.filter((c) => c.tildeltGruppe === filters.gruppe);
  if (filters.typeKode) rows = rows.filter((c) => c.typeKode === filters.typeKode);
  if (filters.tildeltBrukerId) rows = rows.filter((c) => c.tildeltBrukerId === filters.tildeltBrukerId);
  if (filters.q) {
    const q = filters.q.toLowerCase();
    rows = rows.filter((c) =>
      c.tittel.toLowerCase().includes(q)
      || c.saksnummer.toLowerCase().includes(q)
      || (c.kundeNavn?.toLowerCase().includes(q) ?? false),
    );
  }
  rows.sort((a, b) => b.opprettet.localeCompare(a.opprettet));
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 50;
  return rows.slice(offset, offset + limit);
}

export function memoryInsertEvent(event: Omit<CaseEvent, 'id' | 'tidspunkt'> & { tidspunkt?: string }): CaseEvent {
  const e: CaseEvent = {
    id: randomUUID(),
    tidspunkt: event.tidspunkt ?? new Date().toISOString(),
    ...event,
  };
  const list = events.get(event.sakId) ?? [];
  list.unshift(e);
  events.set(event.sakId, list);
  return e;
}

export function memoryListEvents(sakId: string): CaseEvent[] {
  return events.get(sakId) ?? [];
}

export function memoryCasesNeedingSlaCheck(): Case[] {
  const now = Date.now();
  const seen = new Set<string>();
  return [...cases.values()].filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    if (!c.slaFrist) return false;
    if (['LUKKET', 'LØST'].includes(c.status)) return false;
    return new Date(c.slaFrist).getTime() <= now || (!c.slaAdvarselSendt && new Date(c.slaFrist).getTime() - now < 3600000);
  });
}
