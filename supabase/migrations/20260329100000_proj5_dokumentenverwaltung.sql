-- ============================================================================
-- PROJ-5: Dokumentenverwaltung
-- Migration: 20260329100000_proj5_dokumentenverwaltung.sql
-- ADR-009 (Dokumenten-Storage und Upload-Strategie)
-- ============================================================================

-- ============================================================================
-- 1. Extension: pg_trgm (fuer Trigramm-basierte Dateinamen-Suche)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- 2. Enum: dokument_kategorie
-- ============================================================================

CREATE TYPE dokument_kategorie AS ENUM (
  'antragsunterlagen',
  'plaene',
  'gutachten',
  'bescheide',
  'schriftverkehr',
  'sonstiges'
);

-- ============================================================================
-- 3. Tabelle: vorgang_dokumente (mandantenfaehig)
-- Metadaten zu hochgeladenen Dokumenten eines Vorgangs.
-- Storage-Pfade liegen in vorgang_dokument_versionen.
-- ============================================================================

CREATE TABLE vorgang_dokumente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL REFERENCES vorgaenge(id) ON DELETE CASCADE,
  dateiname text NOT NULL,
  kategorie dokument_kategorie NOT NULL DEFAULT 'sonstiges',
  beschreibung text,
  schlagwoerter text[] DEFAULT '{}',
  aktuelle_version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'active', 'failed')),
  uploaded_by uuid NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE vorgang_dokumente IS 'Mandantenfaehig: Dokument-Metadaten eines Vorgangs. RLS via get_tenant_id().';
COMMENT ON COLUMN vorgang_dokumente.status IS 'uploading: Upload laeuft, active: erfolgreich, failed: Upload fehlgeschlagen.';
COMMENT ON COLUMN vorgang_dokumente.aktuelle_version IS 'Aktuelle Versionsnummer, wird bei neuem Upload inkrementiert.';
COMMENT ON COLUMN vorgang_dokumente.schlagwoerter IS 'Freitext-Tags fuer Filterung und Suche.';
COMMENT ON COLUMN vorgang_dokumente.uploaded_by IS 'User-ID des Erstellers (auth.users.id).';

-- ============================================================================
-- 4. Tabelle: vorgang_dokument_versionen (mandantenfaehig, revisionssicher)
-- Jede Version einer Datei wird unveraenderlich gespeichert.
-- DELETE ist per RLS verboten (Revisionssicherheit).
-- ============================================================================

CREATE TABLE vorgang_dokument_versionen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  dokument_id uuid NOT NULL REFERENCES vorgang_dokumente(id) ON DELETE CASCADE,
  version integer NOT NULL,
  dateiname text NOT NULL,
  mime_type text NOT NULL,
  dateigroesse bigint NOT NULL,
  storage_pfad text NOT NULL,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  ocr_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(dokument_id, version)
);

COMMENT ON TABLE vorgang_dokument_versionen IS 'Mandantenfaehig, revisionssicher: Dateiversionen. DELETE per RLS verboten.';
COMMENT ON COLUMN vorgang_dokument_versionen.storage_pfad IS 'Pfad in Supabase Storage: {tenant_id}/{vorgang_id}/{dokument_id}/v{n}/original.ext';
COMMENT ON COLUMN vorgang_dokument_versionen.ocr_text IS 'Extrahierter Volltext fuer Suche (via Background Job, ADR-008).';
COMMENT ON COLUMN vorgang_dokument_versionen.dateigroesse IS 'Dateigroesse in Bytes.';

-- ============================================================================
-- 5. RLS: vorgang_dokumente (mandantenfaehig)
-- ============================================================================

ALTER TABLE vorgang_dokumente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vorgang_dokumente_tenant_select" ON vorgang_dokumente
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "vorgang_dokumente_tenant_insert" ON vorgang_dokumente
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "vorgang_dokumente_tenant_update" ON vorgang_dokumente
  FOR UPDATE USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "vorgang_dokumente_tenant_delete" ON vorgang_dokumente
  FOR DELETE USING (tenant_id = get_tenant_id());

-- ============================================================================
-- 6. RLS: vorgang_dokument_versionen (mandantenfaehig, revisionssicher)
-- DELETE ist deny-all: Versionen duerfen nicht geloescht werden.
-- ============================================================================

ALTER TABLE vorgang_dokument_versionen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vorgang_dokument_versionen_tenant_select" ON vorgang_dokument_versionen
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "vorgang_dokument_versionen_tenant_insert" ON vorgang_dokument_versionen
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "vorgang_dokument_versionen_tenant_update" ON vorgang_dokument_versionen
  FOR UPDATE USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "vorgang_dokument_versionen_deny_delete" ON vorgang_dokument_versionen
  FOR DELETE USING (false);

-- ============================================================================
-- 7. Indizes
-- ============================================================================

-- Hauptindex: Dokumente eines Vorgangs innerhalb eines Mandanten
CREATE INDEX idx_vd_tenant_vorgang ON vorgang_dokumente(tenant_id, vorgang_id);

-- GIN-Index fuer Schlagwort-Filterung (Array-Contains-Queries)
CREATE INDEX idx_vd_schlagwoerter ON vorgang_dokumente USING GIN(schlagwoerter);

-- Trigramm-Index fuer unscharfe Dateinamen-Suche (ILIKE, similarity)
CREATE INDEX idx_vd_dateiname_trgm ON vorgang_dokumente USING GIN(dateiname gin_trgm_ops);

-- Versionen eines Dokuments (abgedeckt durch UNIQUE constraint, explizit fuer Klarheit)
CREATE INDEX idx_vdv_dokument ON vorgang_dokument_versionen(dokument_id, version);

-- ============================================================================
-- 8. Trigger: updated_at auf vorgang_dokumente
-- Nutzt bestehende update_updated_at() aus PROJ-2 Migration.
-- ============================================================================

CREATE TRIGGER trg_vorgang_dokumente_updated_at
  BEFORE UPDATE ON vorgang_dokumente
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
