// ── Domain types ──
export type SakStatus =
  | 'OPPRETTET'
  | 'TILDELT'
  | 'UNDER_ARBEID'
  | 'ESKALERT'
  | 'UNDER_ARBEID_2LINJE'
  | 'LØST'
  | 'LUKKET'
  | 'GJENÅPNET';

export type SakPrioritet = 'lav' | 'normal' | 'høy' | 'kritisk';

export type HendelseType =
  | 'created'
  | 'status_changed'
  | 'assigned'
  | 'comment'
  | 'escalated'
  | 'sla_warning'
  | 'sla_breached'
  | 'reopened'
  | 'closed'
  | 'resolved';

export interface CaseType {
  typeKode: string;
  navn: string;
  beskrivelse: string;
  slaTimer: number | null;
  slaAktiv: boolean;
  aktiv: boolean;
}

export interface RoutingRule {
  regelId: string;
  typeKode: string;
  malgruppe: string;
  prioritet: number;
  autoTildel: boolean;
  aktiv: boolean;
}

export interface Case {
  id: string;
  saksnummer: string;
  typeKode: string;
  typeNavn?: string;
  status: SakStatus;
  prioritet: SakPrioritet;
  tittel: string;
  beskrivelse?: string;
  kundeId?: string;
  kundeNavn?: string;
  kundeEpost?: string;
  kundeTelefon?: string;
  bestillerId?: string;
  tildeltGruppe?: string;
  tildeltBrukerId?: string;
  opprettetAv?: string;
  opprettet: string;
  sistOppdatert: string;
  slaFrist?: string;
  slaBrudd: boolean;
  slaAdvarselSendt: boolean;
  lukket?: string;
  løst?: string;
  gjenåpnet?: string;
  gjenåpningsGrunn?: string;
  kilde: string;
  kildeRef?: string;
  eksternCsId?: string;
  metadata: Record<string, unknown>;
}

export interface CaseEvent {
  id: string;
  sakId: string;
  hendelseType: HendelseType;
  fraStatus?: SakStatus;
  tilStatus?: SakStatus;
  fraGruppe?: string;
  tilGruppe?: string;
  utførtAv?: string;
  utførtAvNavn?: string;
  kommentar?: string;
  metadata: Record<string, unknown>;
  tidspunkt: string;
}

export interface CreateCaseInput {
  typeKode: string;
  tittel: string;
  beskrivelse?: string;
  prioritet?: SakPrioritet;
  kundeId?: string;
  kundeNavn?: string;
  kundeEpost?: string;
  kundeTelefon?: string;
  bestillerId?: string;
  opprettetAv?: string;
  opprettetAvNavn?: string;
  kilde?: string;
  kildeRef?: string;
  metadata?: Record<string, unknown>;
}

export interface CaseListFilters {
  status?: SakStatus;
  gruppe?: string;
  typeKode?: string;
  tildeltBrukerId?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface Actor {
  brukerId?: string;
  brukerNavn?: string;
}
