CREATE TABLE IF NOT EXISTS sales_core.beregnede_bonuser (
  bonus_id        UUID PRIMARY KEY,
  opprettet       TIMESTAMPTZ NOT NULL DEFAULT now(),
  selger_id       UUID,
  selger_navn     TEXT,
  enhet_id        TEXT,
  bygg_id         TEXT,
  runde_id        UUID,
  utfall          TEXT NOT NULL DEFAULT 'sold',
  solgte_produkter JSONB NOT NULL DEFAULT '[]',
  linjer          JSONB NOT NULL DEFAULT '[]',
  total_bonus_kr  INTEGER NOT NULL DEFAULT 0,
  periode_maaned  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bonuser_periode ON sales_core.beregnede_bonuser (periode_maaned);
CREATE INDEX IF NOT EXISTS idx_bonuser_selger ON sales_core.beregnede_bonuser (selger_navn);
CREATE INDEX IF NOT EXISTS idx_bonuser_opprettet ON sales_core.beregnede_bonuser (opprettet DESC);
