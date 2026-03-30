-- ============================================================================
-- ROLLBACK: PROJ-41 Loeschkonzept und Aufbewahrungsfristen (DSGVO)
-- Migration: 20260329100700_proj41_loeschkonzept_dsgvo.sql
--
-- Ausfuehrung: SQL manuell via Supabase Dashboard SQL Editor oder psql,
-- danach: supabase migration repair --status reverted 20260329100700
--
-- ACHTUNG: Destruktive Operation -- DROP TABLE entfernt alle Daten in diesen Tabellen.
-- Vor Ausfuehrung: Datensicherung pruefen.
-- ============================================================================


-- ============================================================================
-- 1. loeschung_freigaben entfernen (abhaengig von nichts)
-- ============================================================================

-- Trigger
DROP TRIGGER IF EXISTS trg_loeschung_freigaben_updated_at ON loeschung_freigaben;

-- Indizes (werden automatisch mit DROP TABLE entfernt, aber explizit fuer Teilrollback)
DROP INDEX IF EXISTS idx_loeschung_freigaben_vorgang;
DROP INDEX IF EXISTS idx_loeschung_freigaben_tenant_status;
DROP INDEX IF EXISTS idx_loeschung_freigaben_tenant;

-- Policies
DROP POLICY IF EXISTS "loeschung_freigaben_deny_delete" ON loeschung_freigaben;
DROP POLICY IF EXISTS "loeschung_freigaben_tenant_update" ON loeschung_freigaben;
DROP POLICY IF EXISTS "loeschung_freigaben_tenant_insert" ON loeschung_freigaben;
DROP POLICY IF EXISTS "loeschung_freigaben_tenant_select" ON loeschung_freigaben;

-- Tabelle
DROP TABLE IF EXISTS loeschung_freigaben;


-- ============================================================================
-- 2. vorgang_loeschungen entfernen
-- ============================================================================

-- Indizes
DROP INDEX IF EXISTS idx_vorgang_loeschungen_tenant_geloescht_am;
DROP INDEX IF EXISTS idx_vorgang_loeschungen_tenant;

-- Policies
DROP POLICY IF EXISTS "vorgang_loeschungen_deny_delete" ON vorgang_loeschungen;
DROP POLICY IF EXISTS "vorgang_loeschungen_deny_update" ON vorgang_loeschungen;
DROP POLICY IF EXISTS "vorgang_loeschungen_deny_insert" ON vorgang_loeschungen;
DROP POLICY IF EXISTS "vorgang_loeschungen_tenant_select" ON vorgang_loeschungen;

-- Tabelle
DROP TABLE IF EXISTS vorgang_loeschungen;


-- ============================================================================
-- 3. config_aufbewahrungsfristen entfernen
-- ============================================================================

-- Trigger
DROP TRIGGER IF EXISTS trg_config_aufbewahrungsfristen_updated_at ON config_aufbewahrungsfristen;

-- Indizes
DROP INDEX IF EXISTS idx_config_aufbewahrungsfristen_tenant;

-- Policies
DROP POLICY IF EXISTS "config_aufbewahrungsfristen_tenant_delete" ON config_aufbewahrungsfristen;
DROP POLICY IF EXISTS "config_aufbewahrungsfristen_tenant_update" ON config_aufbewahrungsfristen;
DROP POLICY IF EXISTS "config_aufbewahrungsfristen_tenant_insert" ON config_aufbewahrungsfristen;
DROP POLICY IF EXISTS "config_aufbewahrungsfristen_tenant_select" ON config_aufbewahrungsfristen;

-- Tabelle
DROP TABLE IF EXISTS config_aufbewahrungsfristen;


-- ============================================================================
-- 4. Spalte abgeschlossen_am von vorgaenge entfernen
-- ============================================================================

-- Index
DROP INDEX IF EXISTS idx_vorgaenge_abgeschlossen_am;

-- Spalte
ALTER TABLE vorgaenge DROP COLUMN IF EXISTS abgeschlossen_am;
