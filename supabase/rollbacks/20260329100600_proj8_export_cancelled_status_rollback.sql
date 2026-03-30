-- ============================================================================
-- ROLLBACK: PROJ-8 Datenexport -- Status 'cancelled' entfernen
-- Rollback fuer: 20260329100600_proj8_export_cancelled_status.sql
--
-- VORAUSSETZUNG: Keine Zeile darf status='cancelled' haben.
-- Falls doch, zuerst ausfuehren:
--   UPDATE background_jobs SET status = 'failed' WHERE status = 'cancelled';
--
-- Ausfuehrung:
--   1. SQL manuell via Supabase Dashboard SQL Editor oder psql ausfuehren
--   2. supabase migration repair --status reverted 20260329100600
-- ============================================================================


-- 1. Pruefen ob 'cancelled'-Zeilen existieren (manuell verifizieren!)
-- SELECT count(*) FROM background_jobs WHERE status = 'cancelled';
-- Falls > 0: UPDATE background_jobs SET status = 'failed' WHERE status = 'cancelled';


-- 2. CHECK-Constraint auf Original-Werteliste zuruecksetzen
ALTER TABLE background_jobs DROP CONSTRAINT IF EXISTS background_jobs_status_check;

ALTER TABLE background_jobs ADD CONSTRAINT background_jobs_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter'));


-- 3. Kommentar auf Original zuruecksetzen
COMMENT ON COLUMN background_jobs.status IS 'Lifecycle: pending->processing->completed|failed. Nach max_attempts: dead_letter.';
