-- ============================================================================
-- PROJ-2: Mandanten-Schema und RLS-Grundstruktur
-- Migration: 20260326100000_proj2_mandanten_schema_rls.sql
-- ADR-007 (Multi-Tenancy), ADR-002 (Auth/RBAC), ADR-005 (Audit-Trail)
-- ============================================================================

-- ============================================================================
-- 1. Rollen-Enum (ADR-002)
-- ============================================================================

CREATE TYPE user_role AS ENUM (
  'sachbearbeiter',
  'referatsleiter',
  'amtsleiter',
  'tenant_admin',
  'platform_admin'
);

-- ============================================================================
-- 2. Tabelle: tenants (Service-Only)
-- Zentrale Mandantentabelle. Jeder Tenant = eine Kommune/Behoerde.
-- ============================================================================

CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  bundesland text NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE tenants IS 'Service-Only: Mandantenstamm. Zugriff nur ueber Service-Role-Key.';
COMMENT ON COLUMN tenants.slug IS 'URL-freundlicher Bezeichner, eindeutig.';
COMMENT ON COLUMN tenants.bundesland IS 'Bestimmt Regelwerk-Konfiguration (LBO, Fristen, Gebuehren).';
COMMENT ON COLUMN tenants.settings IS 'Mandantenspezifische Konfiguration (Aktenzeichen-Schema, Timeouts etc.)';

-- RLS: Service-Only (deny-all fuer alle Client-Rollen)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_deny_select" ON tenants
  FOR SELECT USING (false);
CREATE POLICY "tenants_deny_insert" ON tenants
  FOR INSERT WITH CHECK (false);
CREATE POLICY "tenants_deny_update" ON tenants
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "tenants_deny_delete" ON tenants
  FOR DELETE USING (false);

-- ============================================================================
-- 3. Tabelle: tenant_members (Service-Only)
-- Zuordnung Benutzer -> Mandant mit Rolle.
-- ============================================================================

CREATE TABLE tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'sachbearbeiter',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

COMMENT ON TABLE tenant_members IS 'Service-Only: Mandanten-Mitgliedschaft. 1 User = 1 Tenant (Phase 1). Zugriff nur ueber Service-Role-Key.';
COMMENT ON COLUMN tenant_members.role IS 'Rolle im Mandant gemaess ADR-002 RBAC-Modell.';

-- RLS: Service-Only (deny-all)
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_members_deny_select" ON tenant_members
  FOR SELECT USING (false);
CREATE POLICY "tenant_members_deny_insert" ON tenant_members
  FOR INSERT WITH CHECK (false);
CREATE POLICY "tenant_members_deny_update" ON tenant_members
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "tenant_members_deny_delete" ON tenant_members
  FOR DELETE USING (false);

-- Index: Schneller Lookup bei Login (user_id -> tenant_id + role)
CREATE INDEX idx_tenant_members_user_id ON tenant_members(user_id);
CREATE INDEX idx_tenant_members_tenant_id ON tenant_members(tenant_id);

-- ============================================================================
-- 4. Tabelle: audit_log (Service-Only, Append-Only)
-- ADR-005 Stufe 1: Unveraenderliches Audit-Protokoll.
-- Nur INSERT erlaubt. Kein UPDATE, kein DELETE -- auch nicht per Service-Role
-- (dokumentiertes Restrisiko: Service-Role KANN technisch manipulieren).
-- ============================================================================

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  payload jsonb NOT NULL DEFAULT '{}',
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_log IS 'Append-Only Audit-Trail (ADR-005 Stufe 1). Kein UPDATE/DELETE. Zugriff nur ueber writeAuditLog().';
COMMENT ON COLUMN audit_log.action IS 'z.B. tenant.created, user.role_changed, verfahren.status_changed';
COMMENT ON COLUMN audit_log.resource_type IS 'z.B. tenant, user, verfahren, dokument, bescheid';
COMMENT ON COLUMN audit_log.payload IS 'Vorher/Nachher-Diff oder relevante Kontextdaten.';

-- RLS: Deny-all fuer Client-Rollen (kein SELECT, kein INSERT, kein UPDATE, kein DELETE)
-- INSERT erfolgt ausschliesslich ueber Service-Role via writeAuditLog()
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_deny_select" ON audit_log
  FOR SELECT USING (false);
CREATE POLICY "audit_log_deny_insert" ON audit_log
  FOR INSERT WITH CHECK (false);
CREATE POLICY "audit_log_deny_update" ON audit_log
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "audit_log_deny_delete" ON audit_log
  FOR DELETE USING (false);

-- Indizes fuer Audit-Abfragen (Admin-Dashboard, Compliance-Berichte)
CREATE INDEX idx_audit_log_tenant_id ON audit_log(tenant_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);

-- ============================================================================
-- 5. Trigger: updated_at automatisch aktualisieren
-- Erlaubt gemaess database.md (strukturell, keine Geschaeftslogik)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Kein updated_at-Trigger auf tenant_members (kein updated_at-Feld)
-- Kein updated_at-Trigger auf audit_log (Append-Only, kein UPDATE erlaubt)

-- ============================================================================
-- 6. Hilfsfunktion: Tenant-ID aus JWT extrahieren (NULL-sicher)
-- Wird von allen mandantenfaehigen RLS-Policies referenziert.
-- Gibt NULL zurueck wenn kein Claim vorhanden -> kein Zugriff (fail-closed)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('request.jwt.claims', true)::json->>'tenant_id', '')::uuid;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_tenant_id() IS 'Extrahiert tenant_id aus JWT Custom Claim. NULL-sicher: Gibt NULL zurueck bei fehlendem Claim -> RLS verweigert Zugriff (fail-closed).';

-- ============================================================================
-- 7. RLS-Policy-Template fuer mandantenfaehige Tabellen (als Referenz)
-- Nicht ausfuehrbar -- dient als Dokumentation fuer zukuenftige Migrationen.
-- ============================================================================

-- TEMPLATE (nicht ausfuehren -- copy-paste fuer neue mandantenfaehige Tabellen):
--
-- ALTER TABLE <tabelle> ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "<tabelle>_tenant_select" ON <tabelle>
--   FOR SELECT USING (tenant_id = get_tenant_id());
--
-- CREATE POLICY "<tabelle>_tenant_insert" ON <tabelle>
--   FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
--
-- CREATE POLICY "<tabelle>_tenant_update" ON <tabelle>
--   FOR UPDATE USING (tenant_id = get_tenant_id())
--   WITH CHECK (tenant_id = get_tenant_id());
--
-- CREATE POLICY "<tabelle>_tenant_delete" ON <tabelle>
--   FOR DELETE USING (tenant_id = get_tenant_id());
--
-- CREATE INDEX idx_<tabelle>_tenant_id ON <tabelle>(tenant_id);
