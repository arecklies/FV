-- ============================================================================
-- PROJ-7: XBau-Versionierung pro Mandant
-- Migration: 20260328220000_tenants_xbau_version.sql
-- ADR-015 (XBau-Nachrichten-Datenmodell): Spalte xbau_version auf tenants
--
-- Rueckwaertskompatibel: NOT NULL mit DEFAULT '2.6' — bestehende Zeilen
-- erhalten automatisch den Default-Wert. Kein Locking-Problem bei kleiner
-- tenants-Tabelle (< 1000 Zeilen).
--
-- Voraussetzung: 20260326100000_proj2_mandanten_schema_rls.sql (tenants)
-- ============================================================================


-- ============================================================================
-- 1. ALTER TABLE: tenants — xbau_version Spalte
-- ADR-015: Routing nach XBau-Version erst bei Parallelbetrieb aktiv.
-- MVP-Default '2.6' — aendert sich erst bei XBau-Standardaktualisierung.
-- ============================================================================

ALTER TABLE tenants
  ADD COLUMN xbau_version text NOT NULL DEFAULT '2.6';

COMMENT ON COLUMN tenants.xbau_version IS 'XBau-Standard-Version fuer diesen Mandanten (ADR-015). Default 2.6. Routing bei Parallelbetrieb mehrerer Versionen.';


-- ============================================================================
-- Rollback-Hinweis
-- ============================================================================
-- Rollback-Script: supabase/rollbacks/20260328220000_tenants_xbau_version_rollback.sql
--
-- ALTER TABLE tenants DROP COLUMN IF EXISTS xbau_version;
