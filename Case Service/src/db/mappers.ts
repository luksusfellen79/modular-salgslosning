// ── DB row ↔ API type mappers ──
import { Case, CaseEvent, CaseType, RoutingRule, SakPrioritet, SakStatus } from '../types';

interface SakRow {
  sak_id: string;
  saksnummer: string;
  type_kode: string;
  type_navn?: string;
  status: SakStatus;
  prioritet: SakPrioritet;
  tittel: string;
  beskrivelse: string | null;
  kunde_id: string | null;
  kunde_navn: string | null;
  kunde_epost: string | null;
  kunde_telefon: string | null;
  bestiller_id: string | null;
  tildelt_gruppe: string | null;
  tildelt_bruker_id: string | null;
  opprettet_av: string | null;
  opprettet: Date | string;
  sist_oppdatert: Date | string;
  sla_frist: Date | string | null;
  sla_brudd: boolean;
  sla_advarsel_sendt: boolean;
  lukket: Date | string | null;
  løst: Date | string | null;
  gjenåpnet: Date | string | null;
  gjenåpnings_grunn: string | null;
  kilde: string;
  kilde_ref: string | null;
  ekstern_cs_id: string | null;
  metadata: Record<string, unknown> | null;
}

export function mapSakRow(row: SakRow): Case {
  return {
    id: row.sak_id,
    saksnummer: row.saksnummer,
    typeKode: row.type_kode,
    typeNavn: row.type_navn,
    status: row.status,
    prioritet: row.prioritet,
    tittel: row.tittel,
    beskrivelse: row.beskrivelse ?? undefined,
    kundeId: row.kunde_id ?? undefined,
    kundeNavn: row.kunde_navn ?? undefined,
    kundeEpost: row.kunde_epost ?? undefined,
    kundeTelefon: row.kunde_telefon ?? undefined,
    bestillerId: row.bestiller_id ?? undefined,
    tildeltGruppe: row.tildelt_gruppe ?? undefined,
    tildeltBrukerId: row.tildelt_bruker_id ?? undefined,
    opprettetAv: row.opprettet_av ?? undefined,
    opprettet: new Date(row.opprettet).toISOString(),
    sistOppdatert: new Date(row.sist_oppdatert).toISOString(),
    slaFrist: row.sla_frist ? new Date(row.sla_frist).toISOString() : undefined,
    slaBrudd: row.sla_brudd,
    slaAdvarselSendt: row.sla_advarsel_sendt,
    lukket: row.lukket ? new Date(row.lukket).toISOString() : undefined,
    løst: row.løst ? new Date(row.løst).toISOString() : undefined,
    gjenåpnet: row.gjenåpnet ? new Date(row.gjenåpnet).toISOString() : undefined,
    gjenåpningsGrunn: row.gjenåpnings_grunn ?? undefined,
    kilde: row.kilde,
    kildeRef: row.kilde_ref ?? undefined,
    eksternCsId: row.ekstern_cs_id ?? undefined,
    metadata: row.metadata ?? {},
  };
}

export function mapHendelseRow(row: {
  hendelse_id: string;
  sak_id: string;
  hendelse_type: string;
  fra_status: SakStatus | null;
  til_status: SakStatus | null;
  fra_gruppe: string | null;
  til_gruppe: string | null;
  utført_av: string | null;
  utført_av_navn: string | null;
  kommentar: string | null;
  metadata: Record<string, unknown> | null;
  tidspunkt: Date | string;
}): CaseEvent {
  return {
    id: row.hendelse_id,
    sakId: row.sak_id,
    hendelseType: row.hendelse_type as CaseEvent['hendelseType'],
    fraStatus: row.fra_status ?? undefined,
    tilStatus: row.til_status ?? undefined,
    fraGruppe: row.fra_gruppe ?? undefined,
    tilGruppe: row.til_gruppe ?? undefined,
    utførtAv: row.utført_av ?? undefined,
    utførtAvNavn: row.utført_av_navn ?? undefined,
    kommentar: row.kommentar ?? undefined,
    metadata: row.metadata ?? {},
    tidspunkt: new Date(row.tidspunkt).toISOString(),
  };
}

export function mapTypeRow(row: {
  type_kode: string;
  navn: string;
  beskrivelse: string;
  sla_timer: number | null;
  sla_aktiv: boolean;
  aktiv: boolean;
}): CaseType {
  return {
    typeKode: row.type_kode,
    navn: row.navn,
    beskrivelse: row.beskrivelse,
    slaTimer: row.sla_timer,
    slaAktiv: row.sla_aktiv,
    aktiv: row.aktiv,
  };
}

export function mapRuleRow(row: {
  regel_id: string;
  type_kode: string;
  malgruppe: string;
  prioritet: number;
  auto_tildel: boolean;
  aktiv: boolean;
}): RoutingRule {
  return {
    regelId: row.regel_id,
    typeKode: row.type_kode,
    malgruppe: row.malgruppe,
    prioritet: row.prioritet,
    autoTildel: row.auto_tildel,
    aktiv: row.aktiv,
  };
}

export type { SakRow };
