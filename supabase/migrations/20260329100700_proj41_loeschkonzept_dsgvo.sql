-- ============================================================================
-- PROJ-41: Loeschkonzept und Aufbewahrungsfristen (DSGVO Art. 17)
-- Migration: 20260329100700_proj41_loeschkonzept_dsgvo.sql
-- ADR-017 (Loeschstrategie und PII-Inventar), ADR-007 (Multi-Tenancy)
--
-- Aenderungen:
--   1. vorgaenge: Neue Spalte abgeschlossen_am (Fristberechnung)
--   2. config_aufbewahrungsfristen (mandantenfaehig) -- Fristen je Vorgangstyp
--   3. vorgang_loeschungen (mandantenfaehig/Service-Only) -- Loeschprotokoll
--   4. loeschung_freigaben (mandantenfaehig, kein DELETE) -- Vier-Augen-Prinzip
--
-- Voraussetzungen:
--   20260326100000_proj2_mandanten_schema_rls.sql (tenants, get_tenant_id(), update_updated_at())
--   20260326120000_proj3_vorgangsverwaltung.sql (vorgaenge)
-- ============================================================================


-- ============================================================================
-- 1. Neue Spalte auf vorgaenge: abgeschlossen_am
-- Denormalisiertes Feld fuer performante Fristberechnung (ADR-017 Abschnitt 3).
-- NULL-Default = Metadaten-Operation in PostgreSQL (kein Table Rewrite, Zero-Downtime).
-- ============================================================================

ALTER TABLE vorgaenge ADD COLUMN abgeschlossen_am timestamptz;

COMMENT ON COLUMN vorgaenge.abgeschlossen_am IS 'Zeitpunkt des Endstatus. Denormalisierung fuer Fristberechnung (ADR-017). NULL = Vorgang laeuft noch.';

-- Partieller Index: Nur abgeschlossene, nicht soft-geloeschte Vorgaenge
-- Unterstuetzt Query: WHERE abgeschlossen_am IS NOT NULL AND abgeschlossen_am + interval < now()
CREATE INDEX idx_vorgaenge_abgeschlossen_am
  ON vorgaenge(abgeschlossen_am)
  WHERE abgeschlossen_am IS NOT NULL AND deleted_at IS NULL;


-- ============================================================================
-- 2. Tabelle: config_aufbewahrungsfristen (mandantenfaehig)
-- ADR-017: Konfigurierbare Aufbewahrungsfristen je Vorgangstyp und Mandant.
-- ============================================================================

CREATE TABLE config_aufbewahrungsfristen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgangstyp text NOT NULL,
  frist_jahre int NOT NULL DEFAULT 10,
  rechtsgrundlage text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, vorgangstyp)
);

COMMENT ON TABLE config_aufbewahrungsfristen IS 'Mandantenfaehig: Aufbewahrungsfristen je Vorgangstyp (ADR-017). RLS ueber get_tenant_id().';
COMMENT ON COLUMN config_aufbewahrungsfristen.vorgangstyp IS 'z.B. baugenehmigung, bauvoranfrage, freistellung. Referenziert logisch config_verfahrensarten.kuerzel.';
COMMENT ON COLUMN config_aufbewahrungsfristen.frist_jahre IS 'Aufbewahrungsfrist in Jahren ab abgeschlossen_am. Default 10 Jahre.';
COMMENT ON COLUMN config_aufbewahrungsfristen.rechtsgrundlage IS 'z.B. SaechsArchivG Par. 5, BauArchG Par. 12.';

-- RLS: Mandantenfaehig -- alle 4 Operationen mit Tenant-Filter
ALTER TABLE config_aufbewahrungsfristen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_aufbewahrungsfristen_tenant_select"
  ON config_aufbewahrungsfristen
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "config_aufbewahrungsfristen_tenant_insert"
  ON config_aufbewahrungsfristen
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "config_aufbewahrungsfristen_tenant_update"
  ON config_aufbewahrungsfristen
  FOR UPDATE USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "config_aufbewahrungsfristen_tenant_delete"
  ON config_aufbewahrungsfristen
  FOR DELETE USING (tenant_id = get_tenant_id());

-- Indizes
CREATE INDEX idx_config_aufbewahrungsfristen_tenant
  ON config_aufbewahrungsfristen(tenant_id);

-- updated_at-Trigger (erlaubt gemaess database.md: strukturell, keine Geschaeftslogik)
CREATE TRIGGER trg_config_aufbewahrungsfristen_updated_at
  BEFORE UPDATE ON config_aufbewahrungsfristen
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- 3. Tabelle: vorgang_loeschungen (mandantenfaehig SELECT / Service-Only Schreiben)
-- ADR-017: Loeschprotokoll -- dokumentiert was wann von wem geloescht wurde.
-- Enthaelt KEINE PII, nur Referenz-IDs und Vorgangstyp.
-- vorgang_id hat bewusst keinen FK: Der Vorgang ist nach Loeschung weg.
-- ============================================================================

CREATE TABLE vorgang_loeschungen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL,
  vorgangstyp text NOT NULL,
  aktenzeichen_hash text NOT NULL,
  geloescht_von uuid NOT NULL REFERENCES auth.users(id),
  freigegeben_von uuid NOT NULL REFERENCES auth.users(id),
  geloescht_am timestamptz NOT NULL DEFAULT now(),
  dokumente_anzahl int NOT NULL DEFAULT 0,
  audit_eintraege_anonymisiert int NOT NULL DEFAULT 0,
  xbau_nachrichten_bereinigt int NOT NULL DEFAULT 0,
  storage_bytes_freigegeben bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE vorgang_loeschungen IS 'Mandantenfaehig (nur SELECT): Loeschprotokoll (ADR-017). INSERT nur ueber Service-Role (Loeschworker).';
COMMENT ON COLUMN vorgang_loeschungen.vorgang_id IS 'Referenz auf geloeschten Vorgang. Kein FK -- Vorgang existiert nach Loeschung nicht mehr.';
COMMENT ON COLUMN vorgang_loeschungen.aktenzeichen_hash IS 'SHA-256 des Aktenzeichens. Ermoeglicht Zuordnung ohne PII.';
COMMENT ON COLUMN vorgang_loeschungen.storage_bytes_freigegeben IS 'Gesamtgroesse der geloeschten Dateien in Bytes.';

-- RLS: SELECT mandantenfaehig, INSERT/UPDATE/DELETE deny-all (Service-Only fuer INSERT)
ALTER TABLE vorgang_loeschungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vorgang_loeschungen_tenant_select"
  ON vorgang_loeschungen
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "vorgang_loeschungen_deny_insert"
  ON vorgang_loeschungen
  FOR INSERT WITH CHECK (false);

CREATE POLICY "vorgang_loeschungen_deny_update"
  ON vorgang_loeschungen
  FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "vorgang_loeschungen_deny_delete"
  ON vorgang_loeschungen
  FOR DELETE USING (false);

-- Indizes
CREATE INDEX idx_vorgang_loeschungen_tenant
  ON vorgang_loeschungen(tenant_id);

CREATE INDEX idx_vorgang_loeschungen_tenant_geloescht_am
  ON vorgang_loeschungen(tenant_id, geloescht_am DESC);


-- ============================================================================
-- 4. Tabelle: loeschung_freigaben (mandantenfaehig, kein Client-DELETE)
-- ADR-017: Vier-Augen-Prinzip -- Loeschantrag und Freigabe durch verschiedene Personen.
-- vorgang_id hat bewusst keinen FK: Der Vorgang wird nach Freigabe geloescht,
-- die Freigabe-Zeile bleibt als Protokoll bestehen.
-- ============================================================================

CREATE TABLE loeschung_freigaben (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL,
  beantragt_von uuid NOT NULL REFERENCES auth.users(id),
  beantragt_am timestamptz NOT NULL DEFAULT now(),
  freigegeben_von uuid REFERENCES auth.users(id),
  freigegeben_am timestamptz,
  status text NOT NULL DEFAULT 'ausstehend'
    CHECK (status IN ('ausstehend', 'freigegeben', 'abgelehnt')),
  ablehnungsgrund text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT verschiedene_personen CHECK (beantragt_von != freigegeben_von)
);

COMMENT ON TABLE loeschung_freigaben IS 'Mandantenfaehig: Vier-Augen-Loeschfreigabe (ADR-017). Kein Client-DELETE. RLS ueber get_tenant_id().';
COMMENT ON COLUMN loeschung_freigaben.vorgang_id IS 'Referenz auf zu loeschenden Vorgang. Kein FK -- Vorgang wird nach Freigabe geloescht.';
COMMENT ON COLUMN loeschung_freigaben.status IS 'ausstehend -> freigegeben/abgelehnt. Kein Ruecksetzen.';
COMMENT ON COLUMN loeschung_freigaben.ablehnungsgrund IS 'Pflichtfeld bei status=abgelehnt (in Applikationsschicht validiert).';

-- RLS: SELECT/INSERT/UPDATE mandantenfaehig, DELETE deny-all
ALTER TABLE loeschung_freigaben ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loeschung_freigaben_tenant_select"
  ON loeschung_freigaben
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "loeschung_freigaben_tenant_insert"
  ON loeschung_freigaben
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "loeschung_freigaben_tenant_update"
  ON loeschung_freigaben
  FOR UPDATE USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "loeschung_freigaben_deny_delete"
  ON loeschung_freigaben
  FOR DELETE USING (false);

-- Indizes
CREATE INDEX idx_loeschung_freigaben_tenant
  ON loeschung_freigaben(tenant_id);

CREATE INDEX idx_loeschung_freigaben_tenant_status
  ON loeschung_freigaben(tenant_id, status)
  WHERE status = 'ausstehend';

CREATE INDEX idx_loeschung_freigaben_vorgang
  ON loeschung_freigaben(vorgang_id);

-- updated_at-Trigger
CREATE TRIGGER trg_loeschung_freigaben_updated_at
  BEFORE UPDATE ON loeschung_freigaben
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
