-- ============================================================================
-- PROJ-48: Verlängerung der Baugenehmigung — Geltungsdauer und Verlängerungshistorie
-- Migration: 20260327200000_proj48_geltungsdauer_verlaengerung.sql
--
-- Aenderungen:
--   1. vorgaenge: ADD COLUMN geltungsdauer_bis (timestamptz, nullable)
--   2. config_fristen: ADD COLUMN kalendertage (integer, nullable), werktage DROP NOT NULL
--   3. vorgang_verlaengerungen (neu, Service-Only) — Verlängerungshistorie
--   4. config_fristen: INSERT Geltungsdauer-Einträge (NRW + BW)
--
-- Voraussetzungen:
--   20260326120000_proj3_vorgangsverwaltung.sql (vorgaenge, config_verfahrensarten)
--   20260326140000_proj4_fristmanagement.sql (config_fristen)
--   20260328100000_proj44_lbo_bw_konfiguration.sql (BW-Verfahrensarten)
--
-- Rechtsgrundlage:
--   NRW: § 75 Abs. 1 BauO NRW — Genehmigung erlischt nach 3 Jahren
--   BW:  § 62 LBO BW — Genehmigung erlischt nach 3 Jahren
--
-- Zero-Downtime: Ja (alle ADD COLUMN nullable, kein Table-Rewrite)
-- ============================================================================


-- ============================================================================
-- 1. ALTER TABLE vorgaenge: Geltungsdauer-Feld
-- ============================================================================

ALTER TABLE vorgaenge ADD COLUMN geltungsdauer_bis timestamptz;

COMMENT ON COLUMN vorgaenge.geltungsdauer_bis IS 'PROJ-48: Ablaufdatum der Baugenehmigung. Automatisch gesetzt bei Bescheidzustellung (Workflow-Schritt "zustellung"). NULL bei Kenntnisgabe und noch nicht zugestellten Vorgaengen.';

-- Partial Index: Nur Vorgaenge mit gesetzter Geltungsdauer (fuer spaetere Ablauf-Queries)
CREATE INDEX idx_vorgaenge_geltungsdauer ON vorgaenge(tenant_id, geltungsdauer_bis)
  WHERE geltungsdauer_bis IS NOT NULL;


-- ============================================================================
-- 2. ALTER TABLE config_fristen: Kalendertage-Feld + Constraint-Anpassung
-- Geltungsdauer wird in Kalendertagen gerechnet (§ 75 BauO NRW: "3 Jahre"),
-- bestehende Fristen in Werktagen. Genau eines von beiden muss gesetzt sein.
-- ============================================================================

-- 2a. Neue Spalte
ALTER TABLE config_fristen ADD COLUMN kalendertage integer;

COMMENT ON COLUMN config_fristen.kalendertage IS 'PROJ-48: Fristdauer in Kalendertagen (fuer Geltungsdauer). Mutually exclusive mit werktage: genau eines muss gesetzt sein.';

-- 2b. Bestehenden NOT NULL + CHECK auf werktage entfernen
-- (werktage war: NOT NULL CHECK (werktage > 0))
ALTER TABLE config_fristen ALTER COLUMN werktage DROP NOT NULL;
ALTER TABLE config_fristen DROP CONSTRAINT IF EXISTS config_fristen_werktage_check;

-- 2c. Neuer CHECK: Genau eines von werktage/kalendertage muss gesetzt und positiv sein
ALTER TABLE config_fristen ADD CONSTRAINT config_fristen_dauer_check
  CHECK (
    (werktage IS NOT NULL AND werktage > 0 AND kalendertage IS NULL)
    OR
    (kalendertage IS NOT NULL AND kalendertage > 0 AND werktage IS NULL)
  );


-- ============================================================================
-- 3. Neue Tabelle: vorgang_verlaengerungen (Service-Only)
-- Verlängerungshistorie je Vorgang (PROJ-48 US-3, US-4, US-5)
-- ============================================================================

CREATE TABLE vorgang_verlaengerungen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL REFERENCES vorgaenge(id) ON DELETE CASCADE,

  -- Verlängerungsdaten
  altes_datum timestamptz NOT NULL,
  neues_datum timestamptz NOT NULL,
  antragsdatum date NOT NULL,
  begruendung text NOT NULL,
  verlaengerung_tage integer NOT NULL CHECK (verlaengerung_tage > 0),

  -- Wer hat die Verlängerung erfasst?
  sachbearbeiter_id uuid NOT NULL REFERENCES auth.users(id),

  -- Metadaten
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE vorgang_verlaengerungen IS 'Service-Only: Verlängerungshistorie fuer Baugenehmigungen (PROJ-48). Zugriff nur ueber Service-Role.';
COMMENT ON COLUMN vorgang_verlaengerungen.altes_datum IS 'Geltungsdauer_bis VOR der Verlaengerung.';
COMMENT ON COLUMN vorgang_verlaengerungen.neues_datum IS 'Geltungsdauer_bis NACH der Verlaengerung.';
COMMENT ON COLUMN vorgang_verlaengerungen.antragsdatum IS 'Datum des schriftlichen Verlaengerungsantrags des Bauherrn.';
COMMENT ON COLUMN vorgang_verlaengerungen.verlaengerung_tage IS 'Verlaengerung in Kalendertagen (Standard: 365).';

-- RLS: Service-Only (deny-all fuer Client-Rollen)
ALTER TABLE vorgang_verlaengerungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vorgang_verlaengerungen_deny_select" ON vorgang_verlaengerungen
  FOR SELECT USING (false);
CREATE POLICY "vorgang_verlaengerungen_deny_insert" ON vorgang_verlaengerungen
  FOR INSERT WITH CHECK (false);
CREATE POLICY "vorgang_verlaengerungen_deny_update" ON vorgang_verlaengerungen
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "vorgang_verlaengerungen_deny_delete" ON vorgang_verlaengerungen
  FOR DELETE USING (false);

-- Index: Verlängerungen eines Vorgangs (Detail-Ansicht, chronologisch)
CREATE INDEX idx_vorgang_verlaengerungen_vorgang ON vorgang_verlaengerungen(vorgang_id, created_at DESC);

-- Index: Tenant-Lookup (Admin-Queries)
CREATE INDEX idx_vorgang_verlaengerungen_tenant ON vorgang_verlaengerungen(tenant_id);


-- ============================================================================
-- 4. Config-Daten: Geltungsdauer je Bundesland und Verfahrensart
-- Typ 'geltungsdauer' mit kalendertage (nicht werktage)
-- ============================================================================

INSERT INTO config_fristen (bundesland, verfahrensart_id, typ, bezeichnung, kalendertage, rechtsgrundlage) VALUES
  -- NRW: § 75 Abs. 1 BauO NRW — 3 Jahre
  ('NW', 'b0000000-0000-4000-8000-000000000001', 'geltungsdauer', 'Geltungsdauer Baugenehmigung',  1095, '§ 75 Abs. 1 BauO NRW'),
  ('NW', 'b0000000-0000-4000-8000-000000000002', 'geltungsdauer', 'Geltungsdauer Baugenehmigung',  1095, '§ 75 Abs. 1 BauO NRW'),
  ('NW', 'b0000000-0000-4000-8000-000000000003', 'geltungsdauer', 'Geltungsdauer Freistellung',    1095, '§ 63 Abs. 4 BauO NRW'),
  -- BW: § 62 LBO BW — 3 Jahre
  ('BW', 'b1000000-0000-4000-8000-000000000002', 'geltungsdauer', 'Geltungsdauer Baugenehmigung',  1095, '§ 62 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000003', 'geltungsdauer', 'Geltungsdauer Baugenehmigung',  1095, '§ 62 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000004', 'geltungsdauer', 'Geltungsdauer Bauvorbescheid',  1095, '§ 62 LBO BW');
  -- Kein Eintrag fuer BW Kenntnisgabe (b1000000-...-000000000001): keine Geltungsdauer


-- ============================================================================
-- Rollback (als Referenz, ausfuehren via supabase/rollbacks/):
--
-- DELETE FROM config_fristen WHERE typ = 'geltungsdauer';
-- DROP TABLE IF EXISTS vorgang_verlaengerungen CASCADE;
-- ALTER TABLE config_fristen DROP CONSTRAINT IF EXISTS config_fristen_dauer_check;
-- ALTER TABLE config_fristen DROP COLUMN IF EXISTS kalendertage;
-- ALTER TABLE config_fristen ALTER COLUMN werktage SET NOT NULL;
-- ALTER TABLE config_fristen ADD CONSTRAINT config_fristen_werktage_check CHECK (werktage > 0);
-- DROP INDEX IF EXISTS idx_vorgaenge_geltungsdauer;
-- ALTER TABLE vorgaenge DROP COLUMN IF EXISTS geltungsdauer_bis;
-- ============================================================================
