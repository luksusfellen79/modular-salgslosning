-- ── Sales Core — pipeline, tilbud og selgerregister ─────────────────────────────────
-- Kjør i Railway PostgreSQL (schema: sales_core)

CREATE SCHEMA IF NOT EXISTS sales_core;

-- ── MDU — Pipeline og tilbud ───────────────────────────────────────────────────

CREATE TYPE sales_core.deal_status AS ENUM (
  'lead', 'kontaktet', 'befaring', 'tilbud-sendt', 'forhandling',
  'war-room', 'war-room-godkjent', 'war-room-avvist', 'vunnet', 'tapt'
);

CREATE TABLE sales_core.mdu_deals (
  deal_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bygg_id         TEXT NOT NULL,
  adresse         TEXT NOT NULL,
  antall_enheter  INTEGER NOT NULL DEFAULT 0,
  status          sales_core.deal_status NOT NULL DEFAULT 'lead',
  selger_id       UUID NOT NULL,
  leder_id        UUID,
  verdi_kr        NUMERIC(10,2),
  sannsynlighet   INTEGER CHECK (sannsynlighet BETWEEN 0 AND 100),
  forventet_close DATE,
  notater         TEXT,
  opprettet       TIMESTAMPTZ NOT NULL DEFAULT now(),
  sist_oppdatert  TIMESTAMPTZ NOT NULL DEFAULT now(),
  vunnet_dato     TIMESTAMPTZ,
  tapt_dato       TIMESTAMPTZ,
  tapt_årsak      TEXT
);

CREATE INDEX ON sales_core.mdu_deals(selger_id);
CREATE INDEX ON sales_core.mdu_deals(status);
CREATE INDEX ON sales_core.mdu_deals(bygg_id);

CREATE TABLE sales_core.mdu_deal_events (
  event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id         UUID NOT NULL REFERENCES sales_core.mdu_deals(deal_id) ON DELETE CASCADE,
  hendelse        TEXT NOT NULL,
  fra_status      sales_core.deal_status,
  til_status      sales_core.deal_status,
  utført_av       UUID NOT NULL,
  kommentar       TEXT,
  tidspunkt       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON sales_core.mdu_deal_events(deal_id);

CREATE TABLE sales_core.tilbud (
  tilbud_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id         UUID NOT NULL REFERENCES sales_core.mdu_deals(deal_id) ON DELETE CASCADE,
  produkt_id      TEXT NOT NULL,
  antall_enheter  INTEGER NOT NULL,
  pris_per_enhet  NUMERIC(8,2) NOT NULL,
  total_kr        NUMERIC(10,2) GENERATED ALWAYS AS (antall_enheter * pris_per_enhet) STORED,
  kampanje_id     TEXT,
  kampanje_rabatt NUMERIC(8,2) DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'utkast',
  gyldig_til      DATE,
  opprettet       TIMESTAMPTZ NOT NULL DEFAULT now(),
  sendt_dato      TIMESTAMPTZ,
  akseptert_dato  TIMESTAMPTZ
);

CREATE INDEX ON sales_core.tilbud(deal_id);

-- ── SDU — Selgerregister og besøksrunder ──────────────────────────────────────

CREATE TABLE sales_core.sdu_selgere (
  selger_id       UUID PRIMARY KEY REFERENCES hub.brukere,
  region          TEXT NOT NULL DEFAULT 'Oslo',
  mål_besøk_dag   INTEGER NOT NULL DEFAULT 20,
  aktiv           BOOLEAN NOT NULL DEFAULT TRUE,
  opprettet       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sales_core.sdu_runder (
  runde_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  navn            TEXT NOT NULL,
  bygg_id         TEXT NOT NULL,
  selger_id       UUID NOT NULL REFERENCES sales_core.sdu_selgere(selger_id),
  leder_id        UUID NOT NULL,
  dato            DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'planlagt',
  opprettet       TIMESTAMPTZ NOT NULL DEFAULT now(),
  startet         TIMESTAMPTZ,
  fullført         TIMESTAMPTZ
);

CREATE INDEX ON sales_core.sdu_runder(selger_id, dato);
CREATE INDEX ON sales_core.sdu_runder(bygg_id);

CREATE TABLE sales_core.sdu_besøk (
  besøk_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runde_id        UUID NOT NULL REFERENCES sales_core.sdu_runder(runde_id) ON DELETE CASCADE,
  leilighet_id    TEXT NOT NULL,
  etasje          INTEGER,
  person_id       TEXT,
  utfall          TEXT NOT NULL DEFAULT 'ikke-besøkt',
  produkt_id      TEXT,
  notater         TEXT,
  tidspunkt       TIMESTAMPTZ,
  opprettet       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON sales_core.sdu_besøk(runde_id);
CREATE INDEX ON sales_core.sdu_besøk(utfall);
