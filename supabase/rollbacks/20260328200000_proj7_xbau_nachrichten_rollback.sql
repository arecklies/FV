-- ============================================================================
-- ROLLBACK: PROJ-7 XBau-Nachrichten-Schema
-- Migration: 20260328200000_proj7_xbau_nachrichten.sql
--
-- Ausfuehrung: SQL manuell via Supabase Dashboard SQL Editor oder psql
-- Danach: supabase migration repair --status reverted 20260328200000
-- ============================================================================

-- 1. Revert: config_verfahrensarten.xbau_code entfernen
DROP INDEX IF EXISTS idx_config_verfahrensarten_xbau;
ALTER TABLE config_verfahrensarten DROP COLUMN IF EXISTS xbau_code;

-- 2. Revert: config_xbau_codelisten komplett entfernen
DROP TRIGGER IF EXISTS trg_config_xbau_codelisten_updated_at ON config_xbau_codelisten;
DROP TABLE IF EXISTS config_xbau_codelisten;

-- 3. Revert: xbau_nachrichten komplett entfernen
DROP TRIGGER IF EXISTS trg_xbau_nachrichten_updated_at ON xbau_nachrichten;
DROP TABLE IF EXISTS xbau_nachrichten;
