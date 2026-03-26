-- ============================================================================
-- ROLLBACK: PROJ-2 Mandanten-Schema und RLS-Grundstruktur
-- Ausfuehrung: Manuell via Supabase Dashboard SQL Editor oder psql
-- Danach: supabase migration repair --status reverted 20260326100000
-- ============================================================================

-- Hilfsfunktion entfernen
DROP FUNCTION IF EXISTS get_tenant_id();

-- updated_at-Trigger und Funktion entfernen
DROP TRIGGER IF EXISTS trg_tenants_updated_at ON tenants;
DROP FUNCTION IF EXISTS update_updated_at();

-- Tabellen in umgekehrter Reihenfolge entfernen (FK-Abhaengigkeiten)
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS tenant_members;
DROP TABLE IF EXISTS tenants;

-- Enum-Typ entfernen
DROP TYPE IF EXISTS user_role;
