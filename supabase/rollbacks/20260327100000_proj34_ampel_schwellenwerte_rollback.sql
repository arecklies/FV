-- ============================================================================
-- PROJ-34: Rollback — Konfigurierbare Ampel-Schwellenwerte
-- Entfernt gelb_ab, rot_ab und den zugehoerigen Constraint aus config_fristen.
--
-- Ausfuehrung: SQL manuell via Supabase Dashboard SQL Editor oder psql,
-- danach: supabase migration repair --status reverted 20260327100000
-- ============================================================================

ALTER TABLE config_fristen DROP CONSTRAINT IF EXISTS chk_gelb_groesser_rot;
ALTER TABLE config_fristen DROP COLUMN IF EXISTS gelb_ab;
ALTER TABLE config_fristen DROP COLUMN IF EXISTS rot_ab;
