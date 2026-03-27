-- ============================================================================
-- PROJ-35: Vertretungsregelung Vier-Augen-Freigabe — ROLLBACK
-- Rollback fuer: 20260327130000_proj35_stellvertreter_freigabe.sql
--
-- Ausfuehrung:
--   1. SQL manuell via Supabase Dashboard SQL Editor oder psql ausfuehren
--   2. Danach: supabase migration repair --status reverted 20260327130000
--
-- Reihenfolge: Erst Spalte entfernen, dann Tabelle droppen
-- (umgekehrte Reihenfolge der Migration)
-- ============================================================================


-- ============================================================================
-- 1. Spalte vertretung_fuer von vorgang_workflow_schritte entfernen
-- ACHTUNG: Bestehende Daten in dieser Spalte gehen verloren.
-- Vor Ausfuehrung pruefen: SELECT count(*) FROM vorgang_workflow_schritte
--   WHERE vertretung_fuer IS NOT NULL;
-- ============================================================================

ALTER TABLE vorgang_workflow_schritte
  DROP COLUMN IF EXISTS vertretung_fuer;


-- ============================================================================
-- 2. Tabelle freigabe_stellvertreter vollstaendig entfernen
-- CASCADE entfernt automatisch: Policies, Indizes, Constraints
-- ACHTUNG: Alle Stellvertreter-Zuordnungen gehen verloren.
-- Vor Ausfuehrung pruefen: SELECT count(*) FROM freigabe_stellvertreter;
-- ============================================================================

DROP TABLE IF EXISTS freigabe_stellvertreter CASCADE;
