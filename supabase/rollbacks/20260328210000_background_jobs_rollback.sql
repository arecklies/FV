-- ============================================================================
-- ROLLBACK: 20260328210000_background_jobs.sql
-- Entfernt die background_jobs-Tabelle vollstaendig.
--
-- Ausfuehrung: SQL manuell via Supabase Dashboard SQL Editor oder psql,
-- danach: supabase migration repair --status reverted 20260328210000
--
-- WARNUNG: Bestehende Jobs gehen verloren. Vor Ausfuehrung sicherstellen,
-- dass keine Jobs im Status 'processing' sind.
-- ============================================================================

-- Trigger zuerst entfernen
DROP TRIGGER IF EXISTS trg_background_jobs_updated_at ON background_jobs;

-- Indizes entfernen (werden mit DROP TABLE entfernt, aber explizit fuer Klarheit)
DROP INDEX IF EXISTS idx_background_jobs_type_status;
DROP INDEX IF EXISTS idx_background_jobs_worker_poll;

-- RLS-Policies werden mit DROP TABLE entfernt

-- Tabelle entfernen
DROP TABLE IF EXISTS background_jobs;
