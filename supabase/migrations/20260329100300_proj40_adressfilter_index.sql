-- ============================================================================
-- PROJ-40: Adressfilter Vorgangsliste — Trigram-Index fuer unscharfe Adresssuche
-- Migration: 20260329100300_proj40_adressfilter_index.sql
--
-- Voraussetzung: 20260326120000_proj3_vorgangsverwaltung.sql (vorgaenge-Tabelle)
--
-- WICHTIG: Diese Migration enthaelt CREATE INDEX CONCURRENTLY.
-- CONCURRENTLY kann NICHT innerhalb einer Transaktion ausgefuehrt werden.
-- Bei Ausfuehrung via Supabase Dashboard: Statements einzeln ausfuehren.
-- Bei supabase db push: --no-transaction Flag verwenden falls verfuegbar,
-- andernfalls die Statements manuell via SQL Editor ausfuehren.
-- ============================================================================


-- 1. Extension pg_trgm aktivieren (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- 2. Trigram-Index fuer unscharfe Adresssuche (LIKE, ILIKE, %, Similarity)
-- Ergaenzt den bestehenden tsvector-Index (idx_vorgaenge_search) um Pattern-Matching.
-- Partial Index: nur nicht-geloeschte Vorgaenge (konsistent mit allen anderen vorgaenge-Indizes).
--
-- CONCURRENTLY: Kein Lock auf die Tabelle waehrend der Index-Erstellung.
-- Kann nicht in einer Transaktion laufen — kein BEGIN/COMMIT um dieses Statement.
CREATE INDEX CONCURRENTLY idx_vorgaenge_adresse_trgm
  ON vorgaenge
  USING gin(grundstueck_adresse gin_trgm_ops)
  WHERE deleted_at IS NULL;
