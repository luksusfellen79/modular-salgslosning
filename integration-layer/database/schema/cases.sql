-- ── Case Service — ticketing og saksbehandling ───────────────────────────────────────
-- Kjør i Railway PostgreSQL (schema: cases)
-- Erstatter Salesforce Service Cloud

CREATE SCHEMA IF NOT EXISTS cases;

-- ── Status og prioritet ─────────────────────────────────────────────────────────────

CREATE TYPE cases.sak_status AS ENUM (
  'OPPRETTET',
  'TILDELT',
  'UNDER_ARBEID',
  'ESKALERT',
  'UNDER_ARBEID_2LINJE',
  'LØST',
  'LUKKET',
  'GJENÅPNET'
);

CREATE TYPE cases.sak_prioritet AS ENUM (
  'lav',
  'normal',
  'høy',
  'kritisk'
);

-- ── Typeregister ────────────────────────────────────────────────────────────────────

CREATE TABLE cases.typeregister (
  type_kode       TEXT PRIMARY KEY,
  navn            TEXT NOT NULL,
  beskrivelse     TEXT NOT NULL,
  sla_timer       INTEGER,                    -- NULL = SLA deaktivert for typen
  sla_aktiv       BOOLEAN NOT NULL DEFAULT FALSE,
  aktiv           BOOLEAN NOT NULL DEFAULT TRUE,
  opprettet       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Rutingregler (casetype → teknisk gruppe / kundeservice) ─────────────────────────

CREATE TABLE cases.rutingregler (
  regel_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_kode       TEXT NOT NULL UNIQUE REFERENCES cases.typeregister(type_kode),
  malgruppe       TEXT NOT NULL,              -- f.eks. 'teknisk-fiber', 'kundeservice'
  prioritet       INTEGER NOT NULL DEFAULT 100,
  auto_tildel     BOOLEAN NOT NULL DEFAULT TRUE,
  aktiv           BOOLEAN NOT NULL DEFAULT TRUE,
  opprettet       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON cases.rutingregler(type_kode);
CREATE INDEX ON cases.rutingregler(malgruppe);

-- ── Saker ───────────────────────────────────────────────────────────────────────────

CREATE SEQUENCE cases.saksnummer_seq START 1;

CREATE TABLE cases.saker (
  sak_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saksnummer          TEXT NOT NULL UNIQUE,
  type_kode           TEXT NOT NULL REFERENCES cases.typeregister(type_kode),
  status              cases.sak_status NOT NULL DEFAULT 'OPPRETTET',
  prioritet           cases.sak_prioritet NOT NULL DEFAULT 'normal',
  tittel              TEXT NOT NULL,
  beskrivelse         TEXT,
  kunde_id            TEXT,
  kunde_navn          TEXT,
  kunde_epost         TEXT,
  kunde_telefon       TEXT,
  bestiller_id        TEXT,                   -- ordre-/kontrakt-referanse
  tildelt_gruppe      TEXT,
  tildelt_bruker_id   UUID,
  opprettet_av        UUID,
  opprettet           TIMESTAMPTZ NOT NULL DEFAULT now(),
  sist_oppdatert      TIMESTAMPTZ NOT NULL DEFAULT now(),
  sla_frist           TIMESTAMPTZ,
  sla_brudd           BOOLEAN NOT NULL DEFAULT FALSE,
  sla_advarsel_sendt  BOOLEAN NOT NULL DEFAULT FALSE,
  lukket              TIMESTAMPTZ,
  løst                TIMESTAMPTZ,
  gjenåpnet           TIMESTAMPTZ,
  gjenåpnings_grunn   TEXT,
  kilde               TEXT NOT NULL DEFAULT 'manual',  -- manual | eventbus | api
  kilde_ref           TEXT,                   -- eventId, correlationId, osv.
  ekstern_cs_id       TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX ON cases.saker(status);
CREATE INDEX ON cases.saker(type_kode);
CREATE INDEX ON cases.saker(tildelt_gruppe);
CREATE INDEX ON cases.saker(tildelt_bruker_id);
CREATE INDEX ON cases.saker(sla_frist);
CREATE INDEX ON cases.saker(opprettet DESC);
CREATE INDEX ON cases.saker(saksnummer);

-- ── Hendelseslogg per sak ───────────────────────────────────────────────────────────

CREATE TABLE cases.hendelser (
  hendelse_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sak_id          UUID NOT NULL REFERENCES cases.saker(sak_id) ON DELETE CASCADE,
  hendelse_type   TEXT NOT NULL,              -- status_changed | assigned | comment | escalated | sla_warning | sla_breached | created | reopened | closed
  fra_status      cases.sak_status,
  til_status      cases.sak_status,
  fra_gruppe      TEXT,
  til_gruppe      TEXT,
  utført_av       UUID,
  utført_av_navn  TEXT,
  kommentar       TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  tidspunkt       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON cases.hendelser(sak_id);
CREATE INDEX ON cases.hendelser(tidspunkt DESC);
CREATE INDEX ON cases.hendelser(hendelse_type);

-- ── Seed: 7 standard casetyper ────────────────────────────────────────────────────────

INSERT INTO cases.typeregister (type_kode, navn, beskrivelse, sla_timer, sla_aktiv) VALUES
  ('ORDER_FEIL',       'Ordrefeil',           'Feil i ordreprosessering eller ordrestatus i verdikjeden',           8,  TRUE),
  ('AKTIVERING_FEIL',  'Aktiveringsfeil',     'Feil ved aktivering av tjeneste (fiber, mobil, TV)',                 4,  TRUE),
  ('FIBER_FEIL',       'Fiberfeil',           'Tekniske feil knyttet til fiber-leveranse og -provisjonering',       8,  TRUE),
  ('MOBILFEIL',        'Mobilfeil',           'Feil knyttet til mobilabonnement, SIM eller mobilnett',                8,  TRUE),
  ('FAKTURA_FEIL',     'Fakturafeil',         'Feil i fakturering, betaling eller kreditering',                    24,  TRUE),
  ('TV_FEIL',          'TV-feil',             'Feil knyttet til TV-tjenester og TV-aktivering',                     8,  TRUE),
  ('KUNDEHENVENDELSE', 'Kundehenvendelse',    'Generell kundehenvendelse opprettet manuelt av kundeservice',       24,  FALSE)
ON CONFLICT (type_kode) DO UPDATE SET
  navn = EXCLUDED.navn,
  beskrivelse = EXCLUDED.beskrivelse,
  sla_timer = EXCLUDED.sla_timer,
  sla_aktiv = EXCLUDED.sla_aktiv,
  aktiv = TRUE;

-- ── Seed: standard rutingregler ─────────────────────────────────────────────────────

INSERT INTO cases.rutingregler (type_kode, malgruppe, prioritet, auto_tildel) VALUES
  ('ORDER_FEIL',       'teknisk-ordre',      10, TRUE),
  ('AKTIVERING_FEIL',  'teknisk-aktivering', 10, TRUE),
  ('FIBER_FEIL',       'teknisk-fiber',      10, TRUE),
  ('MOBILFEIL',        'teknisk-mobil',      10, TRUE),
  ('FAKTURA_FEIL',     'teknisk-faktura',    10, TRUE),
  ('TV_FEIL',          'teknisk-aktivering', 20, TRUE),
  ('KUNDEHENVENDELSE', 'kundeservice',       10, TRUE)
ON CONFLICT (type_kode) DO UPDATE SET
  malgruppe = EXCLUDED.malgruppe,
  prioritet = EXCLUDED.prioritet,
  auto_tildel = EXCLUDED.auto_tildel,
  aktiv = TRUE;
