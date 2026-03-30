-- ============================================================================
-- ROLLBACK: PROJ-40 Adressfilter-Index
-- Migration: 20260329100300_proj40_adressfilter_index.sql
--
-- Ausfuehrung:
--   1. SQL manuell via Supabase Dashboard SQL Editor oder psql ausfuehren
--   2. supabase migration repair --status reverted 20260329100300
-- ============================================================================


-- 1. Trigram-Index entfernen
DROP INDEX IF EXISTS idx_vorgaenge_adresse_trgm;


-- 2. Extension pg_trgm entfernen (nur wenn keine anderen Objekte sie nutzen)
-- HINWEIS: DROP EXTENSION schlaegt fehl wenn andere Indizes/Operatoren pg_trgm nutzen.
-- In dem Fall: Extension beibehalten (kein Schaden, kein Speicherverbrauch).
DROP EXTENSION IF EXISTS pg_trgm;
