-- ── MDU — Kundeportal og kontrakter ───────────────────────────────────────────────────────
-- Kjør i Railway PostgreSQL (schema: mdu)

CREATE SCHEMA IF NOT EXISTS mdu;

-- Kunder (borettslag / sameier / næringsbygg)
CREATE TABLE mdu.kunder (
  kunde_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisasjonsnr TEXT UNIQUE,
  navn            TEXT NOT NULL,
  kontaktperson   TEXT,
  epost           TEXT,
  telefon         TEXT,
  bygg_id         TEXT NOT NULL,
  adresse         TEXT NOT NULL,
  antall_enheter  INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'prospekt',
  opprettet       TIMESTAMPTZ NOT NULL DEFAULT now(),
  sist_oppdatert  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON mdu.kunder(bygg_id);
CREATE INDEX ON mdu.kunder(status);

-- Kontrakter
CREATE TABLE mdu.kontrakter (
  kontrakt_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kunde_id        UUID NOT NULL REFERENCES mdu.kunder(kunde_id),
  deal_id         UUID NOT NULL,
  produkt_id      TEXT NOT NULL,
  antall_enheter  INTEGER NOT NULL,
  pris_per_enhet  NUMERIC(8,2) NOT NULL,
  binding_mnd     INTEGER NOT NULL DEFAULT 0,
  startdato       DATE NOT NULL,
  sluttdato       DATE,
  status          TEXT NOT NULL DEFAULT 'aktiv',
  signert_dato    TIMESTAMPTZ,
  signert_av      TEXT,
  dokument_url    TEXT,
  opprettet       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON mdu.kontrakter(kunde_id);
CREATE INDEX ON mdu.kontrakter(status);

-- Aktiveringslogg per enhet i bygg
CREATE TABLE mdu.enhetsaktiveringer (
  aktivering_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kontrakt_id     UUID NOT NULL REFERENCES mdu.kontrakter(kontrakt_id),
  leilighet_id    TEXT NOT NULL,
  etasje          INTEGER,
  aktivert_dato   DATE,
  status          TEXT NOT NULL DEFAULT 'ikke-aktivert',
  feil_beskrivelse TEXT,
  oppdatert       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON mdu.enhetsaktiveringer(kontrakt_id);
CREATE INDEX ON mdu.enhetsaktiveringer(status);
