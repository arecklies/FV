-- ============================================================================
-- ROLLBACK: PROJ-6 Bescheiderzeugung
-- Rollback fuer: 20260329100100_proj6_bescheiderzeugung.sql
--
-- Ausfuehrung: SQL manuell via Supabase Dashboard SQL Editor oder psql
-- Danach: supabase migration repair --status reverted 20260329100100
--
-- ACHTUNG: Loescht alle Daten in text_bausteine und vorgang_bescheide!
-- Vor Ausfuehrung: Backup der Tabellen pruefen.
-- ============================================================================


-- ============================================================================
-- 1. Trigger entfernen
-- ============================================================================

DROP TRIGGER IF EXISTS trg_vorgang_bescheide_updated_at ON vorgang_bescheide;
DROP TRIGGER IF EXISTS trg_text_bausteine_updated_at ON text_bausteine;


-- ============================================================================
-- 2. Indizes entfernen
-- ============================================================================

DROP INDEX IF EXISTS idx_vorgang_bescheide_tenant;
DROP INDEX IF EXISTS idx_vorgang_bescheide_tenant_entwurf;
DROP INDEX IF EXISTS idx_vorgang_bescheide_vorgang_status;

DROP INDEX IF EXISTS idx_text_bausteine_tenant;
DROP INDEX IF EXISTS idx_text_bausteine_search;
DROP INDEX IF EXISTS idx_text_bausteine_tenant_kategorie;


-- ============================================================================
-- 3. RLS-Policies entfernen
-- ============================================================================

DROP POLICY IF EXISTS "vorgang_bescheide_tenant_delete" ON vorgang_bescheide;
DROP POLICY IF EXISTS "vorgang_bescheide_tenant_update" ON vorgang_bescheide;
DROP POLICY IF EXISTS "vorgang_bescheide_tenant_insert" ON vorgang_bescheide;
DROP POLICY IF EXISTS "vorgang_bescheide_tenant_select" ON vorgang_bescheide;

DROP POLICY IF EXISTS "text_bausteine_deny_delete" ON text_bausteine;
DROP POLICY IF EXISTS "text_bausteine_admin_update" ON text_bausteine;
DROP POLICY IF EXISTS "text_bausteine_admin_insert" ON text_bausteine;
DROP POLICY IF EXISTS "text_bausteine_tenant_select" ON text_bausteine;


-- ============================================================================
-- 4. Tabellen entfernen (Reihenfolge: abhaengige zuerst)
-- ============================================================================

DROP TABLE IF EXISTS vorgang_bescheide;
DROP TABLE IF EXISTS text_bausteine;


-- ============================================================================
-- 5. ENUMs entfernen
-- ============================================================================

DROP TYPE IF EXISTS bescheid_status;
DROP TYPE IF EXISTS bescheidtyp;
