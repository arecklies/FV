-- ============================================================================
-- PROJ-22: Cron-Job Feiertags-Korrektheit und Batch-Optimierung
-- Migration: 20260327110000_proj22_frist_bundesland.sql
--
-- Aenderung: vorgang_fristen erhaelt Spalte `bundesland` (text NOT NULL)
-- damit der Cron-Job Feiertage je Bundesland laden kann ohne vorgaenge-Join.
--
-- Zero-Downtime: ADD COLUMN (nullable) -> Backfill -> SET NOT NULL
-- Voraussetzung: Alle vorgaenge haben bundesland befuellt (Annahme aus Spec)
-- ============================================================================

-- Step 1: Spalte hinzufuegen (nullable fuer Backfill)
ALTER TABLE vorgang_fristen ADD COLUMN bundesland text;

COMMENT ON COLUMN vorgang_fristen.bundesland IS 'Bundesland-Kuerzel (z.B. NW, BY). Wird bei Fristanlage aus vorgaenge uebernommen. Fuer Feiertags-Lookup im Cron-Job (PROJ-22).';

-- Step 2: Backfill aus vorgaenge
UPDATE vorgang_fristen
SET bundesland = v.bundesland
FROM vorgaenge v
WHERE vorgang_fristen.vorgang_id = v.id
  AND vorgang_fristen.bundesland IS NULL;

-- Step 3: NOT NULL Constraint setzen
ALTER TABLE vorgang_fristen ALTER COLUMN bundesland SET NOT NULL;

-- Step 4: Index fuer Cron-Job (gruppierter Lookup nach bundesland + aktiv)
CREATE INDEX idx_vorgang_fristen_bundesland ON vorgang_fristen(bundesland, aktiv)
  WHERE aktiv = true AND gehemmt = false;
