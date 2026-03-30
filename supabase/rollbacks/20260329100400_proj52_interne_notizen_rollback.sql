-- ============================================================================
-- ROLLBACK: PROJ-52 Interne Vorgang-Notizen
-- Revert: 20260329100400_proj52_interne_notizen.sql
--
-- Ausfuehrung:
--   1. SQL manuell via Supabase Dashboard SQL Editor oder psql ausfuehren
--   2. supabase migration repair --status reverted 20260329100400
--
-- ACHTUNG: Bestehende Kommentare mit ist_privat = true verlieren ihre
-- Privat-Markierung. Vor Rollback pruefen ob solche Eintraege existieren:
--   SELECT count(*) FROM vorgang_kommentare WHERE ist_privat = true;
-- ============================================================================

ALTER TABLE vorgang_kommentare
  DROP COLUMN ist_privat;
