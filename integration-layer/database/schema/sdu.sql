-- ── SDU — Incentiver og bonuser ──────────────────────────────────────────────────────
-- Kjør i Railway PostgreSQL (schema: sdu)

CREATE SCHEMA IF NOT EXISTS sdu;

-- Bonusregler (konfigureres av leder)
CREATE TABLE sdu.bonusregler (
  regel_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  navn            TEXT NOT NULL,
  produkt_id      TEXT,
  bonus_kr        NUMERIC(8,2) NOT NULL,
  gyldig_fra      DATE NOT NULL,
  gyldig_til      DATE,
  aktiv           BOOLEAN NOT NULL DEFAULT TRUE,
  opprettet_av    UUID NOT NULL,
  opprettet       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Oppnådde bonuser per selger
CREATE TABLE sdu.bonuser (
  bonus_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  selger_id       UUID NOT NULL,
  regel_id        UUID REFERENCES sdu.bonusregler(regel_id),
  besøk_id        UUID,
  produkt_id      TEXT NOT NULL,
  bonus_kr        NUMERIC(8,2) NOT NULL,
  periode_måned   TEXT NOT NULL,
  utbetalt        BOOLEAN NOT NULL DEFAULT FALSE,
  utbetalt_dato   DATE,
  opprettet       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON sdu.bonuser(selger_id, periode_måned);
CREATE INDEX ON sdu.bonuser(utbetalt);

-- Oppsummering per selger per periode
CREATE TABLE sdu.månedlig_oppsummering (
  oppsummering_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  selger_id       UUID NOT NULL,
  periode_måned   TEXT NOT NULL,
  antall_besøk    INTEGER NOT NULL DEFAULT 0,
  antall_salg     INTEGER NOT NULL DEFAULT 0,
  total_bonus_kr  NUMERIC(10,2) NOT NULL DEFAULT 0,
  konverteringsrate NUMERIC(5,2),
  oppdatert       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(selger_id, periode_måned)
);

CREATE INDEX ON sdu.månedlig_oppsummering(selger_id);
CREATE INDEX ON sdu.månedlig_oppsummering(periode_måned);
