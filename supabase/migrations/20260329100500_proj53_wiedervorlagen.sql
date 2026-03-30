-- ============================================================================
-- PROJ-53: Wiedervorlagen mit Erinnerung
-- Migration: 20260329100500_proj53_wiedervorlagen.sql
--
-- Tabelle: wiedervorlagen (mandantenfaehig, benutzerbezogen)
--   Persoenliche Merker/Erinnerungen pro User, verknuepft mit Vorgaengen.
--   Hard-Delete erlaubt (keine Audit-Pflicht fuer persoenliche Merker).
--   faellig_am ist date (taggenau, nicht timestamptz).
--
-- Voraussetzungen:
--   20260326100000_proj2_mandanten_schema_rls.sql (tenants, get_tenant_id(), update_updated_at())
--   20260326120000_proj3_vorgangsverwaltung.sql (vorgaenge)
-- ============================================================================


-- ============================================================================
-- 1. Tabelle: wiedervorlagen
-- ============================================================================

CREATE TABLE wiedervorlagen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL REFERENCES vorgaenge(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  faellig_am date NOT NULL,
  betreff text NOT NULL CONSTRAINT wiedervorlagen_betreff_length CHECK (char_length(betreff) <= 200),
  notiz text,
  erledigt_am timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE wiedervorlagen IS 'Mandantenfaehig, benutzerbezogen: Persoenliche Wiedervorlagen/Erinnerungen (PROJ-53). RLS ueber user_id = auth.uid(). Hard-Delete erlaubt.';
COMMENT ON COLUMN wiedervorlagen.faellig_am IS 'Faelligkeitsdatum (taggenau, date). Keine Uhrzeit.';
COMMENT ON COLUMN wiedervorlagen.betreff IS 'Kurztext max. 200 Zeichen.';
COMMENT ON COLUMN wiedervorlagen.erledigt_am IS 'NULL = offen, NOT NULL = erledigt (Zeitstempel der Erledigung).';


-- ============================================================================
-- 2. RLS-Policies (benutzerbezogen)
-- SELECT/UPDATE/DELETE: user_id = auth.uid() (nur eigene Wiedervorlagen)
-- INSERT: user_id = auth.uid() AND tenant_id = get_tenant_id()
--   (verhindert Cross-Tenant-Referenzen bei Anlage)
-- ============================================================================

ALTER TABLE wiedervorlagen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wiedervorlagen_user_select" ON wiedervorlagen
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "wiedervorlagen_user_insert" ON wiedervorlagen
  FOR INSERT WITH CHECK (user_id = auth.uid() AND tenant_id = get_tenant_id());

CREATE POLICY "wiedervorlagen_user_update" ON wiedervorlagen
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "wiedervorlagen_user_delete" ON wiedervorlagen
  FOR DELETE USING (user_id = auth.uid());


-- ============================================================================
-- 3. Indizes
-- ============================================================================

-- Primaer-Index: Offene Wiedervorlagen eines Users nach Faelligkeit sortiert
-- Deckt die Haupt-Query ab: "Zeige meine offenen Wiedervorlagen, dringendste zuerst"
CREATE INDEX idx_wiedervorlagen_user_faellig
  ON wiedervorlagen(user_id, faellig_am)
  WHERE erledigt_am IS NULL;

-- Vorgang-Lookup: Alle Wiedervorlagen zu einem Vorgang (z.B. Vorgang-Detailansicht)
CREATE INDEX idx_wiedervorlagen_vorgang
  ON wiedervorlagen(vorgang_id);

-- Tenant-Index: Fuer administrative Abfragen via Service-Role
CREATE INDEX idx_wiedervorlagen_tenant
  ON wiedervorlagen(tenant_id);


-- ============================================================================
-- 4. updated_at-Trigger
-- ============================================================================

CREATE TRIGGER trg_wiedervorlagen_updated_at
  BEFORE UPDATE ON wiedervorlagen
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
