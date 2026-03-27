-- ============================================================================
-- PROJ-48: Rollback — Geltungsdauer und Verlängerungshistorie
-- Rollback fuer: 20260327200000_proj48_geltungsdauer_verlaengerung.sql
--
-- Ausfuehrung: SQL manuell via Supabase Dashboard SQL Editor oder psql,
-- danach: supabase migration repair --status reverted 20260327200000
--
-- ACHTUNG: Wenn bereits vorgang_verlaengerungen-Eintraege existieren,
-- gehen diese Daten bei Rollback verloren. Geltungsdauer-Werte auf
-- vorgaenge gehen ebenfalls verloren.
-- ============================================================================

-- Reihenfolge: Abhaengigkeiten beachten (FK-Kaskade)

-- 1. Config-Daten entfernen
DELETE FROM config_fristen WHERE typ = 'geltungsdauer';

-- 2. Verlängerungshistorie-Tabelle entfernen
DROP TABLE IF EXISTS vorgang_verlaengerungen CASCADE;

-- 3. config_fristen: kalendertage-Spalte und Constraint zuruecksetzen
ALTER TABLE config_fristen DROP CONSTRAINT IF EXISTS config_fristen_dauer_check;
ALTER TABLE config_fristen DROP COLUMN IF EXISTS kalendertage;
ALTER TABLE config_fristen ALTER COLUMN werktage SET NOT NULL;
ALTER TABLE config_fristen ADD CONSTRAINT config_fristen_werktage_check CHECK (werktage > 0);

-- 4. vorgaenge: geltungsdauer_bis-Spalte entfernen
DROP INDEX IF EXISTS idx_vorgaenge_geltungsdauer;
ALTER TABLE vorgaenge DROP COLUMN IF EXISTS geltungsdauer_bis;
