-- ============================================================================
-- PROJ-52: Interne Vorgang-Notizen (private Kommentare)
-- Migration: 20260329100400_proj52_interne_notizen.sql
--
-- Aenderung: Neue Spalte ist_privat auf vorgang_kommentare
-- Default false = bestehende Kommentare bleiben oeffentlich (fuer alle
-- Tenant-Mitglieder sichtbar). Private Notizen (ist_privat = true) werden
-- in der Service-Schicht gefiltert (Service-Role-Client umgeht RLS).
--
-- Voraussetzung: 20260326120000_proj3_vorgangsverwaltung.sql
--   (vorgang_kommentare Tabelle)
--
-- Zero-Downtime: ADD COLUMN ... NOT NULL DEFAULT ist seit PostgreSQL 11
-- eine reine Metadaten-Aenderung (kein Table-Rewrite, kein Lock).
--
-- RLS: Keine Aenderung. Sichtbarkeitsfilter erfolgt im Service-Layer.
-- ============================================================================

ALTER TABLE vorgang_kommentare
  ADD COLUMN ist_privat boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN vorgang_kommentare.ist_privat IS 'true = private Notiz, nur fuer Autor sichtbar. Default false = oeffentlich fuer alle Tenant-Mitglieder (PROJ-52).';
