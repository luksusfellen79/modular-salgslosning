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
  tildeltGruppe?: string;
  tildeltBrukerId?: string;
  opprettetAvNavn?: string;
  opprettet: string;
  sistOppdatert: string;
  slaFrist?: string;
  slaBrudd: boolean;
  slaAdvarselSendt: boolean;
  lukket?: string;
  løst?: string;
  kilde: string;
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
  utførtAvNavn?: string;
  kommentar?: string;
  tidspunkt: string;
}

export interface CaseListResponse {
  cases: Case[];
  total: number;
}

export type AppMode = 'kundeservice' | 'teknisk';

export type TekniskGruppe =
  | 'teknisk-ordre'
  | 'teknisk-aktivering'
  | 'teknisk-fiber'
  | 'teknisk-mobil'
  | 'teknisk-faktura';

export interface CaseActor {
  brukerId: string;
  brukerNavn: string;
}

export interface CaseAlert {
  id: string;
  type: string;
  message: string;
  caseId?: string;
  saksnummer?: string;
  at: string;
}

export const TEKNISKE_GRUPPER: { id: TekniskGruppe; label: string }[] = [
  { id: 'teknisk-ordre', label: 'Ordre' },
  { id: 'teknisk-aktivering', label: 'Aktivering / TV' },
  { id: 'teknisk-fiber', label: 'Fiber' },
  { id: 'teknisk-mobil', label: 'Mobil' },
  { id: 'teknisk-faktura', label: 'Faktura' },
];

export const STATUS_LABELS: Record<SakStatus, string> = {
  OPPRETTET: 'Opprettet',
  TILDELT: 'Tildelt',
  UNDER_ARBEID: 'Under arbeid',
  ESKALERT: 'Eskalert',
  UNDER_ARBEID_2LINJE: '2. linje',
  LØST: 'Løst',
  LUKKET: 'Lukket',
  GJENÅPNET: 'Gjenåpnet',
};

export const PRIORITET_LABELS: Record<SakPrioritet, string> = {
  lav: 'Lav',
  normal: 'Normal',
  høy: 'Høy',
  kritisk: 'Kritisk',
};
