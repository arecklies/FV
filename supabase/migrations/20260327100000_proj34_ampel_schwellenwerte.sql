-- ============================================================================
-- PROJ-34: Konfigurierbare Ampel-Schwellenwerte
-- Migration: 20260327100000_proj34_ampel_schwellenwerte.sql
--
-- Erweitert config_fristen um optionale Spalten gelb_ab und rot_ab (Prozent).
-- Nicht-destruktiv: ADD COLUMN, nullable, kein Datenverlust.
--
-- Voraussetzung: 20260326140000_proj4_fristmanagement.sql (config_fristen)
-- ============================================================================

-- Spalte gelb_ab: Prozent Restzeit, ab der die Ampel auf gelb wechselt (Standard: 50)
ALTER TABLE config_fristen
  ADD COLUMN gelb_ab integer CHECK (gelb_ab BETWEEN 1 AND 99);

-- Spalte rot_ab: Prozent Restzeit, ab der die Ampel auf rot wechselt (Standard: 25)
ALTER TABLE config_fristen
  ADD COLUMN rot_ab integer CHECK (rot_ab BETWEEN 1 AND 99);

-- Constraint: gelb_ab muss groesser als rot_ab sein (wenn beide gesetzt)
ALTER TABLE config_fristen
  ADD CONSTRAINT chk_gelb_groesser_rot
  CHECK (gelb_ab IS NULL OR rot_ab IS NULL OR gelb_ab > rot_ab);

COMMENT ON COLUMN config_fristen.gelb_ab IS 'Prozent Restzeit fuer Gelb-Schwelle (1-99). NULL = Standard 50%.';
COMMENT ON COLUMN config_fristen.rot_ab IS 'Prozent Restzeit fuer Rot-Schwelle (1-99). NULL = Standard 25%.';
