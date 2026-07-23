-- 001: Per-besøk bygg_id for flerbygg-runder
-- Idempotent — trygg å kjøre flere ganger. Ingen backfill.

ALTER TABLE sales_core."sdu_besøk" ADD COLUMN IF NOT EXISTS bygg_id text;
