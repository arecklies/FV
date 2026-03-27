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

-- Step 2: Backfill aus vorgaenge (in Chunks a 1000 zur Lock-Vermeidung, database.md)
DO $$
DECLARE
  batch_size INT := 1000;
  updated INT := 1;
BEGIN
  WHILE updated > 0 LOOP
    WITH batch AS (
      SELECT vf.id
      FROM vorgang_fristen vf
      WHERE vf.bundesland IS NULL
      LIMIT batch_size
    )
    UPDATE vorgang_fristen vf
    SET bundesland = v.bundesland
    FROM vorgaenge v, batch b
    WHERE vf.id = b.id AND vf.vorgang_id = v.id;
    GET DIAGNOSTICS updated = ROW_COUNT;
  END LOOP;
END $$;

-- Step 3: NOT NULL Constraint setzen
ALTER TABLE vorgang_fristen ALTER COLUMN bundesland SET NOT NULL;

-- Step 4: Index fuer Cron-Job (gruppierter Lookup nach bundesland + aktiv)
CREATE INDEX idx_vorgang_fristen_bundesland ON vorgang_fristen(bundesland, aktiv)
  WHERE aktiv = true AND gehemmt = false;
