-- ============================================================================
-- PROJ-4: Fristmanagement — Rollback
-- Rollback fuer: 20260326140000_proj4_fristmanagement.sql
--
-- Ausfuehrung: Manuell via Supabase Dashboard SQL Editor oder psql
-- Danach: supabase migration repair --status reverted 20260326140000
--
-- Reihenfolge: Abhaengige Tabellen zuerst (FK-Constraints beachten)
-- ============================================================================

-- 1. background_jobs (keine FK-Abhaengigkeiten auf diese Tabelle)
DROP TABLE IF EXISTS background_jobs CASCADE;

-- 2. vorgang_fristen (abhaengig von vorgaenge und tenants, aber keine andere Tabelle haengt davon ab)
DROP TABLE IF EXISTS vorgang_fristen CASCADE;

-- 3. config_feiertage (keine FK-Abhaengigkeiten)
DROP TABLE IF EXISTS config_feiertage CASCADE;

-- 4. config_fristen (abhaengig von config_verfahrensarten, aber keine andere Tabelle haengt davon ab)
DROP TABLE IF EXISTS config_fristen CASCADE;

-- Hinweis: Trigger und Indizes werden automatisch mit den Tabellen geloescht (CASCADE).
-- Hinweis: RLS-Policies werden automatisch mit den Tabellen geloescht.
-- Hinweis: Die Funktion update_updated_at() und get_tenant_id() bleiben erhalten
--          (gehoeren zur PROJ-2 Migration).
