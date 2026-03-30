-- ============================================================================
-- ROLLBACK: PROJ-53 Wiedervorlagen
-- Migration: 20260329100500_proj53_wiedervorlagen.sql
--
-- Ausfuehrung: SQL manuell via Supabase Dashboard SQL Editor oder psql,
-- danach: supabase migration repair --status reverted 20260329100500
-- ============================================================================

-- 1. Trigger entfernen
DROP TRIGGER IF EXISTS trg_wiedervorlagen_updated_at ON wiedervorlagen;

-- 2. Indizes entfernen
DROP INDEX IF EXISTS idx_wiedervorlagen_user_faellig;
DROP INDEX IF EXISTS idx_wiedervorlagen_vorgang;
DROP INDEX IF EXISTS idx_wiedervorlagen_tenant;

-- 3. RLS-Policies entfernen
DROP POLICY IF EXISTS "wiedervorlagen_user_select" ON wiedervorlagen;
DROP POLICY IF EXISTS "wiedervorlagen_user_insert" ON wiedervorlagen;
DROP POLICY IF EXISTS "wiedervorlagen_user_update" ON wiedervorlagen;
DROP POLICY IF EXISTS "wiedervorlagen_user_delete" ON wiedervorlagen;

-- 4. Tabelle entfernen (CASCADE entfernt verbliebene Abhaengigkeiten)
DROP TABLE IF EXISTS wiedervorlagen CASCADE;
