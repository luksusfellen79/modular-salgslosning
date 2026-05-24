-- ── Hub — brukere og sessions ──────────────────────────────────────────────────────
-- Kjør i Railway PostgreSQL (schema: hub)

CREATE SCHEMA IF NOT EXISTS hub;

-- Roller
CREATE TABLE hub.roller (
  rolle_id    TEXT PRIMARY KEY,          -- 'superadmin' | 'mdu-selger' | 'mdu-leder' | 'sdu-selger' | 'sdu-leder'
  beskrivelse TEXT NOT NULL
);

INSERT INTO hub.roller VALUES
  ('superadmin',  'Superadministrator med full tilgang'),
  ('mdu-selger',  'MDU-selger, tilgang til MDU CRM'),
  ('mdu-leder',   'MDU-salgsleder, tilgang til MDU Leder og War Room'),
  ('sdu-selger',  'SDU-feltsalgsselger, tilgang til SDU CRM'),
  ('sdu-leder',   'SDU-salgsleder, tilgang til SDU Planner');

-- Brukere
CREATE TABLE hub.brukere (
  bruker_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  navn          TEXT NOT NULL,
  epost         TEXT UNIQUE,
  pin_hash      TEXT NOT NULL,            -- bcrypt hash av PIN
  rolle_id      TEXT NOT NULL REFERENCES hub.roller(rolle_id),
  aktiv         BOOLEAN NOT NULL DEFAULT TRUE,
  opprettet     TIMESTAMPTZ NOT NULL DEFAULT now(),
  sist_innlogget TIMESTAMPTZ
);

CREATE INDEX ON hub.brukere(rolle_id);
CREATE INDEX ON hub.brukere(epost);

-- Seed-data (PIN-er: 0000 og 1234)
-- Erstatt PLACEHOLDER_HASH-verdiene med ekte bcrypt-hasher:
--   node -e "const bcrypt = require('bcrypt'); bcrypt.hash('0000', 10).then(h => console.log(h));"
--   node -e "const bcrypt = require('bcrypt'); bcrypt.hash('1234', 10).then(h => console.log(h));"
INSERT INTO hub.brukere (navn, epost, pin_hash, rolle_id) VALUES
  ('Jørn Haga',     'jorn.haga@telenor.no',   'PLACEHOLDER_HASH_0000', 'superadmin'),
  ('Nina Lund',     'nina.lund@telenor.no',    'PLACEHOLDER_HASH_1234', 'mdu-leder'),
  ('Per Andersen',  'per.andersen@telenor.no', 'PLACEHOLDER_HASH_1234', 'sdu-leder'),
  ('Lise Berg',     'lise.berg@telenor.no',    'PLACEHOLDER_HASH_1234', 'mdu-selger'),
  ('Kristian Mo',   'kristian.mo@telenor.no',  'PLACEHOLDER_HASH_1234', 'sdu-selger');

-- Sessions (JWT-alternativ for prototype)
CREATE TABLE hub.sessions (
  session_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bruker_id     UUID NOT NULL REFERENCES hub.brukere(bruker_id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  utløper       TIMESTAMPTZ NOT NULL,
  opprettet     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_adresse    TEXT,
  user_agent    TEXT
);

CREATE INDEX ON hub.sessions(token);
CREATE INDEX ON hub.sessions(bruker_id);
CREATE INDEX ON hub.sessions(utløper);
