-- ============================================================================
-- PROJ-37: Frist-Pause bei ruhenden Verfahren — ROLLBACK
-- Rollback fuer: 20260327140000_proj37_frist_pause_verfahrensruhe.sql
--
-- Ausfuehrung:
--   1. SQL manuell via Supabase Dashboard SQL Editor oder psql ausfuehren
--   2. Danach: supabase migration repair --status reverted 20260327140000
--
-- ACHTUNG: Vor Ausfuehrung pruefen!
--   SELECT count(*) FROM vorgang_pausen;
--   SELECT count(*) FROM vorgang_fristen WHERE status = 'pausiert';
--   SELECT count(*) FROM vorgang_fristen WHERE pause_tage_gesamt > 0;
--   Falls Daten vorhanden: Fristen mit status='pausiert' auf 'gruen' zuruecksetzen
-- ============================================================================


-- ============================================================================
-- 1. Pausierte Fristen auf 'gruen' zuruecksetzen (vor CHECK-Aenderung!)
-- ============================================================================

UPDATE vorgang_fristen SET status = 'gruen' WHERE status = 'pausiert';


-- ============================================================================
-- 2. Index zuruecksetzen auf alten Zustand (ohne Pause-Filter)
-- ============================================================================

DROP INDEX IF EXISTS idx_vorgang_fristen_bundesland;

CREATE INDEX idx_vorgang_fristen_bundesland ON vorgang_fristen(bundesland, aktiv)
  WHERE aktiv = true AND gehemmt = false;


-- ============================================================================
-- 3. Spalte pause_tage_gesamt entfernen
-- ============================================================================

ALTER TABLE vorgang_fristen
  DROP COLUMN IF EXISTS pause_tage_gesamt;


-- ============================================================================
-- 4. CHECK-Constraint zuruecksetzen (ohne 'pausiert')
-- ============================================================================

ALTER TABLE vorgang_fristen
  DROP CONSTRAINT vorgang_fristen_status_check;

ALTER TABLE vorgang_fristen
  ADD CONSTRAINT vorgang_fristen_status_check
    CHECK (status IN ('gruen', 'gelb', 'rot', 'dunkelrot', 'gehemmt'));


-- ============================================================================
-- 5. Tabelle vorgang_pausen vollstaendig entfernen
-- CASCADE entfernt automatisch: Policies, Indizes, Constraints, Trigger
-- ACHTUNG: Alle Pause-Daten gehen verloren.
-- ============================================================================

DROP TABLE IF EXISTS vorgang_pausen CASCADE;
