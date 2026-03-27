-- ============================================================================
-- PROJ-22: Rollback — bundesland-Spalte entfernen
-- ============================================================================

DROP INDEX IF EXISTS idx_vorgang_fristen_bundesland;

ALTER TABLE vorgang_fristen DROP COLUMN IF EXISTS bundesland;
