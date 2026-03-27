-- ============================================================================
-- PROJ-37: Frist-Pause bei ruhenden Verfahren
-- Migration: 20260327140000_proj37_frist_pause_verfahrensruhe.sql
-- ADR-014 (Frist-Pause bei Verfahrensruhe)
--
-- Aenderungen:
--   1. Neue Tabelle: vorgang_pausen (mandantenfaehig, RLS)
--   2. ALTER vorgang_fristen: CHECK-Constraint += 'pausiert', ADD pause_tage_gesamt
--   3. Index-Anpassung: idx_vorgang_fristen_bundesland um Pause-Filter erweitern
--
-- Voraussetzungen:
--   20260326100000_proj2_mandanten_schema_rls.sql (tenants, get_tenant_id(), update_updated_at())
--   20260326120000_proj3_vorgangsverwaltung.sql (vorgaenge)
--   20260326140000_proj4_fristmanagement.sql (vorgang_fristen)
--   20260327110000_proj22_frist_bundesland.sql (bundesland auf vorgang_fristen)
--
-- Zero-Downtime: Ja — additive Aenderungen (CREATE TABLE, ADD COLUMN, ALTER CHECK)
-- ============================================================================


-- ============================================================================
-- 1. Tabelle: vorgang_pausen (mandantenfaehig)
-- ADR-014: Separate Tabelle fuer Pause-Historie (Mehrfach-Pause, Werktage pro Pause)
-- ============================================================================

CREATE TABLE vorgang_pausen (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id),
  vorgang_id     uuid NOT NULL REFERENCES vorgaenge(id) ON DELETE CASCADE,

  -- Begruendung ist Pflichtfeld (AC-1.2: min. 3 Zeichen, Validierung in App-Schicht)
  begruendung    text NOT NULL,

  -- Pause-Zeitraum
  pause_start    timestamptz NOT NULL DEFAULT now(),
  pause_ende     timestamptz,              -- NULL = Pause laeuft noch
  pause_werktage int,                      -- berechnet bei Resume, NULL waehrend Pause

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE vorgang_pausen IS 'Mandantenfaehig: Pause-Historie fuer ruhende Verfahren (ADR-014, PROJ-37). Jede Pause ist ein eigener Datensatz.';
COMMENT ON COLUMN vorgang_pausen.pause_ende IS 'NULL = Pause laeuft aktuell. Timestamp = Pause wurde beendet (Resume).';
COMMENT ON COLUMN vorgang_pausen.pause_werktage IS 'Berechnete Werktage der Pause (exkl. Wochenenden/Feiertage). NULL waehrend laufender Pause, berechnet bei Resume.';


-- ============================================================================
-- 2. RLS: Mandantenfaehig (ADR-007 Template)
-- ============================================================================

ALTER TABLE vorgang_pausen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vorgang_pausen_tenant_select" ON vorgang_pausen
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "vorgang_pausen_tenant_insert" ON vorgang_pausen
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "vorgang_pausen_tenant_update" ON vorgang_pausen
  FOR UPDATE USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "vorgang_pausen_tenant_delete" ON vorgang_pausen
  FOR DELETE USING (tenant_id = get_tenant_id());


-- ============================================================================
-- 3. Indizes fuer vorgang_pausen
-- ============================================================================

-- Schneller Check: "Ist Vorgang aktuell pausiert?" (offene Pause ohne Ende)
-- Query-Pattern: WHERE vorgang_id = $1 AND pause_ende IS NULL
CREATE INDEX idx_vorgang_pausen_offen ON vorgang_pausen(vorgang_id)
  WHERE pause_ende IS NULL;

-- Mandanten-Lookup (Admin, Listen)
CREATE INDEX idx_vorgang_pausen_tenant ON vorgang_pausen(tenant_id);

-- Dashboard US-4: Lang ruhende Verfahren (> 30 Tage)
-- Query-Pattern: WHERE tenant_id = $1 AND pause_ende IS NULL AND pause_start < (now() - interval '30 days')
CREATE INDEX idx_vorgang_pausen_langlaeufer ON vorgang_pausen(tenant_id, pause_start)
  WHERE pause_ende IS NULL;

-- updated_at-Trigger
CREATE TRIGGER trg_vorgang_pausen_updated_at
  BEFORE UPDATE ON vorgang_pausen
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- 4. ALTER vorgang_fristen: CHECK-Constraint erweitern um 'pausiert'
-- ADR-014: status-Enum statt separates Boolean (einheitliches Zustandsmodell)
-- ============================================================================

-- Drop alter CHECK und neu anlegen (PostgreSQL erlaubt kein ALTER CHECK)
ALTER TABLE vorgang_fristen
  DROP CONSTRAINT vorgang_fristen_status_check;

ALTER TABLE vorgang_fristen
  ADD CONSTRAINT vorgang_fristen_status_check
    CHECK (status IN ('gruen', 'gelb', 'rot', 'dunkelrot', 'gehemmt', 'pausiert'));


-- ============================================================================
-- 5. ALTER vorgang_fristen: Kumulierte Pause-Tage
-- Analog zu hemmung_tage — Schnellzugriff bei Resume ohne Aggregation
-- ============================================================================

ALTER TABLE vorgang_fristen
  ADD COLUMN pause_tage_gesamt int NOT NULL DEFAULT 0;

COMMENT ON COLUMN vorgang_fristen.pause_tage_gesamt IS 'Kumulierte Pause-Werktage aller abgeschlossenen Pausen (PROJ-37, ADR-014). Bei Resume wird end_datum um diesen Delta verlaengert.';


-- ============================================================================
-- 6. Index-Anpassung: Cron-Job muss pausierte Fristen ueberspringen
-- Der bestehende Partial-Index idx_vorgang_fristen_bundesland filtert auf
-- aktiv = true AND gehemmt = false — muss um status != 'pausiert' erweitert werden.
-- ============================================================================

-- Bestehenden Index entfernen (aus 20260327110000_proj22_frist_bundesland.sql)
DROP INDEX IF EXISTS idx_vorgang_fristen_bundesland;

-- Neuen Index mit Pause-Filter anlegen
CREATE INDEX idx_vorgang_fristen_bundesland ON vorgang_fristen(bundesland, aktiv)
  WHERE aktiv = true AND gehemmt = false AND status != 'pausiert';

-- Kommentar aktualisieren
COMMENT ON COLUMN vorgang_fristen.status IS 'Ampelstatus: gruen (> 50%), gelb (25-50%), rot (< 25% oder < 5 WT), dunkelrot (ueberschritten), gehemmt, pausiert (PROJ-37).';
