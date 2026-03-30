-- ============================================================================
-- PROJ-8: Datenexport -- Status 'cancelled' fuer background_jobs
-- Migration: 20260329100600_proj8_export_cancelled_status.sql
--
-- Erweitert die CHECK-Constraint auf background_jobs.status um den Wert
-- 'cancelled' (Nutzer-initiierter Abbruch, z.B. Export-Abbruch).
--
-- Voraussetzung: 20260328210000_background_jobs.sql
--
-- Lifecycle-Erweiterung (ADR-008):
--   pending -> processing -> completed | failed | cancelled
--   failed -> (retry) -> pending | dead_letter
--   processing -> cancelled (Nutzer-Abbruch)
--
-- Zero-Downtime: CHECK-Constraint-Aenderung ist eine Metadata-Operation,
-- kein Table-Lock auf bestehende Daten. Bestehende Zeilen sind nicht betroffen
-- (kein bestehender Status wird entfernt).
-- ============================================================================


-- ============================================================================
-- 1. CHECK-Constraint erweitern: 'cancelled' hinzufuegen
-- ============================================================================

ALTER TABLE background_jobs DROP CONSTRAINT IF EXISTS background_jobs_status_check;

ALTER TABLE background_jobs ADD CONSTRAINT background_jobs_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter', 'cancelled'));


-- ============================================================================
-- 2. Dokumentation: Status-Kommentar aktualisieren
-- ============================================================================

COMMENT ON COLUMN background_jobs.status IS 'Lifecycle: pending->processing->completed|failed|cancelled. Nach max_attempts: dead_letter. cancelled: Nutzer-initiierter Abbruch (z.B. Export-Abbruch).';


-- ============================================================================
-- Rollback-Hinweis
-- ============================================================================
-- Rollback-Script: supabase/rollbacks/20260329100600_proj8_export_cancelled_status_rollback.sql
--
-- VORAUSSETZUNG: Keine Zeile darf status='cancelled' haben.
-- Falls doch: UPDATE background_jobs SET status='failed' WHERE status='cancelled';
-- Dann Constraint zuruecksetzen auf Original-Werteliste.
