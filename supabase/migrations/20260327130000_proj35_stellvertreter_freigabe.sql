-- ============================================================================
-- PROJ-35: Vertretungsregelung Vier-Augen-Freigabe
-- Migration: 20260327130000_proj35_stellvertreter_freigabe.sql
-- ADR-013 (Stellvertreter-Modell), ADR-011 (Workflow Engine)
--
-- Aenderungen:
--   1. Neue Tabelle: freigabe_stellvertreter (Service-Only, deny-all RLS)
--   2. ALTER vorgang_workflow_schritte: ADD COLUMN vertretung_fuer uuid NULL
--
-- Voraussetzung:
--   20260326100000_proj2_mandanten_schema_rls.sql (tenants, tenant_members)
--   20260326120000_proj3_vorgangsverwaltung.sql (vorgang_workflow_schritte)
--
-- Zero-Downtime: Ja — nur additive Aenderungen (CREATE TABLE, ADD COLUMN NULL)
-- ============================================================================


-- ============================================================================
-- 1. Tabelle: freigabe_stellvertreter (Service-Only)
-- ADR-013: n:m Stellvertreter-Zuordnung fuer Vier-Augen-Freigabe
-- Composite FKs erzwingen Tenant-Isolation auf DB-Ebene
-- ============================================================================

CREATE TABLE freigabe_stellvertreter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vertretener_id uuid NOT NULL,
  stellvertreter_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Composite FKs: Stellen sicher, dass beide User dem gleichen Tenant angehoeren
  -- Referenziert UNIQUE(tenant_id, user_id) auf tenant_members
  CONSTRAINT fk_stellvertreter_vertretener
    FOREIGN KEY (tenant_id, vertretener_id)
    REFERENCES tenant_members(tenant_id, user_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_stellvertreter_stellvertreter
    FOREIGN KEY (tenant_id, stellvertreter_id)
    REFERENCES tenant_members(tenant_id, user_id)
    ON DELETE CASCADE,

  -- Keine Doppelzuordnung (AC-1.5)
  CONSTRAINT uq_stellvertreter_zuordnung
    UNIQUE(tenant_id, vertretener_id, stellvertreter_id),

  -- Keine Selbstzuordnung (AC-1.6)
  CONSTRAINT chk_keine_selbstvertretung
    CHECK(vertretener_id != stellvertreter_id)
);

COMMENT ON TABLE freigabe_stellvertreter IS 'Service-Only: Stellvertreter-Zuordnungen fuer Vier-Augen-Freigabe (ADR-013). Zugriff nur ueber Service-Role-Key.';
COMMENT ON COLUMN freigabe_stellvertreter.vertretener_id IS 'User-ID des vertretenen Referatsleiters. Composite FK mit tenant_id auf tenant_members.';
COMMENT ON COLUMN freigabe_stellvertreter.stellvertreter_id IS 'User-ID des Stellvertreters. Composite FK mit tenant_id auf tenant_members.';


-- ============================================================================
-- 2. RLS: Service-Only (deny-all fuer alle Client-Rollen)
-- Konsistent mit tenants, tenant_members, config_workflows
-- ============================================================================

ALTER TABLE freigabe_stellvertreter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "freigabe_stellvertreter_deny_select" ON freigabe_stellvertreter
  FOR SELECT USING (false);
CREATE POLICY "freigabe_stellvertreter_deny_insert" ON freigabe_stellvertreter
  FOR INSERT WITH CHECK (false);
CREATE POLICY "freigabe_stellvertreter_deny_update" ON freigabe_stellvertreter
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "freigabe_stellvertreter_deny_delete" ON freigabe_stellvertreter
  FOR DELETE USING (false);


-- ============================================================================
-- 3. Indizes
-- ============================================================================

-- Lookup: Welche Freigaben darf ein Stellvertreter sehen?
-- Query-Pattern: WHERE tenant_id = $1 AND stellvertreter_id = $2
CREATE INDEX idx_freigabe_stellvertreter_lookup
  ON freigabe_stellvertreter(tenant_id, stellvertreter_id);

-- Lookup: Wer sind die Stellvertreter eines Referatsleiters?
-- Query-Pattern: WHERE tenant_id = $1 AND vertretener_id = $2
CREATE INDEX idx_freigabe_stellvertreter_vertretener
  ON freigabe_stellvertreter(tenant_id, vertretener_id);


-- ============================================================================
-- 4. ALTER vorgang_workflow_schritte: Vertretungs-Audit-Feld
-- ADR-013: Kein FK — Audit-Charakter, muss nach Loeschung der
-- Vertretungsbeziehung gueltig bleiben
-- ============================================================================

ALTER TABLE vorgang_workflow_schritte
  ADD COLUMN vertretung_fuer uuid;

COMMENT ON COLUMN vorgang_workflow_schritte.vertretung_fuer IS 'User-ID des vertretenen Referatsleiters bei Stellvertreter-Freigabe. NULL bei regulaerer Freigabe. Kein FK (Audit-Charakter, ADR-013).';
