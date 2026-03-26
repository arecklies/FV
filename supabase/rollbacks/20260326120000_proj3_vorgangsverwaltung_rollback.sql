-- ============================================================================
-- ROLLBACK: PROJ-3 Vorgangsverwaltung
-- Rollback fuer: 20260326120000_proj3_vorgangsverwaltung.sql
--
-- Ausfuehrung: SQL manuell via Supabase Dashboard SQL Editor oder psql,
-- danach: supabase migration repair --status reverted 20260326120000
--
-- WARNUNG: Loescht alle Vorgangs-, Kommentar- und Workflow-Daten!
-- Nur ausfuehren nach expliziter Freigabe (Human-in-the-Loop).
-- ============================================================================

-- Reihenfolge: Abhaengige Tabellen zuerst (FK-Constraints)

-- 5. vorgang_workflow_schritte
DROP TABLE IF EXISTS vorgang_workflow_schritte CASCADE;

-- 4. vorgang_kommentare
DROP TABLE IF EXISTS vorgang_kommentare CASCADE;

-- 3. vorgaenge
DROP TABLE IF EXISTS vorgaenge CASCADE;

-- 2. config_workflows
DROP TABLE IF EXISTS config_workflows CASCADE;

-- 1. config_verfahrensarten
DROP TABLE IF EXISTS config_verfahrensarten CASCADE;
