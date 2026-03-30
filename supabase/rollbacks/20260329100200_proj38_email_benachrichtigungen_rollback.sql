-- ============================================================================
-- ROLLBACK: PROJ-38 E-Mail-Benachrichtigungen Fristeskalation
-- Kehrt Migration 20260329100200_proj38_email_benachrichtigungen.sql um.
-- Ausfuehrung: SQL manuell via Supabase Dashboard SQL Editor oder psql,
-- danach: supabase migration repair --status reverted 20260329100200
-- ============================================================================

-- 1. Trigger entfernen
DROP TRIGGER IF EXISTS trg_config_user_benachrichtigungen_updated_at ON config_user_benachrichtigungen;

-- 2. Tabellen entfernen (Policies und Indizes werden automatisch mit gedroppt)
DROP TABLE IF EXISTS config_user_benachrichtigungen;
DROP TABLE IF EXISTS frist_benachrichtigungen;
