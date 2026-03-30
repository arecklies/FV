-- ============================================================================
-- ROLLBACK: PROJ-5 Dokumentenverwaltung
-- Rollback fuer: 20260329100000_proj5_dokumentenverwaltung.sql
--
-- Ausfuehrung: SQL manuell via Supabase Dashboard SQL Editor oder psql,
-- danach: supabase migration repair --status reverted 20260329100000
-- ============================================================================

-- 1. Trigger entfernen
DROP TRIGGER IF EXISTS trg_vorgang_dokumente_updated_at ON vorgang_dokumente;

-- 2. Indizes entfernen
DROP INDEX IF EXISTS idx_vdv_dokument;
DROP INDEX IF EXISTS idx_vd_dateiname_trgm;
DROP INDEX IF EXISTS idx_vd_schlagwoerter;
DROP INDEX IF EXISTS idx_vd_tenant_vorgang;

-- 3. RLS-Policies entfernen: vorgang_dokument_versionen
DROP POLICY IF EXISTS "vorgang_dokument_versionen_deny_delete" ON vorgang_dokument_versionen;
DROP POLICY IF EXISTS "vorgang_dokument_versionen_tenant_update" ON vorgang_dokument_versionen;
DROP POLICY IF EXISTS "vorgang_dokument_versionen_tenant_insert" ON vorgang_dokument_versionen;
DROP POLICY IF EXISTS "vorgang_dokument_versionen_tenant_select" ON vorgang_dokument_versionen;

-- 4. RLS-Policies entfernen: vorgang_dokumente
DROP POLICY IF EXISTS "vorgang_dokumente_tenant_delete" ON vorgang_dokumente;
DROP POLICY IF EXISTS "vorgang_dokumente_tenant_update" ON vorgang_dokumente;
DROP POLICY IF EXISTS "vorgang_dokumente_tenant_insert" ON vorgang_dokumente;
DROP POLICY IF EXISTS "vorgang_dokumente_tenant_select" ON vorgang_dokumente;

-- 5. Tabellen entfernen (Reihenfolge beachten: abhaengige Tabelle zuerst)
DROP TABLE IF EXISTS vorgang_dokument_versionen;
DROP TABLE IF EXISTS vorgang_dokumente;

-- 6. Enum entfernen
DROP TYPE IF EXISTS dokument_kategorie;

-- HINWEIS: pg_trgm wird NICHT entfernt, da die Extension auch von
-- anderen Migrationen genutzt wird (z.B. 20260329100300_proj40_adressfilter_index.sql).
