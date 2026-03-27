-- ============================================================================
-- ROLLBACK: 20260328220000_tenants_xbau_version.sql
-- Entfernt die Spalte xbau_version von der tenants-Tabelle.
--
-- Ausfuehrung: SQL manuell via Supabase Dashboard SQL Editor oder psql,
-- danach: supabase migration repair --status reverted 20260328220000
--
-- Rueckwaertskompatibel: Keine Abhaengigkeiten auf diese Spalte in
-- bestehenden RLS-Policies oder Indizes.
-- ============================================================================

ALTER TABLE tenants DROP COLUMN IF EXISTS xbau_version;
