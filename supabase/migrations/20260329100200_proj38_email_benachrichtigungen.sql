-- ============================================================================
-- PROJ-38: E-Mail-Benachrichtigungen Fristeskalation
-- Migration: 20260329100200_proj38_email_benachrichtigungen.sql
-- ADR-018 (E-Mail-Benachrichtigungsstrategie)
-- ============================================================================

-- ============================================================================
-- 1. Tabelle: frist_benachrichtigungen (Service-Only)
-- Duplikat-Schutz fuer E-Mail-Versand bei Ampelwechsel.
-- Dient gleichzeitig als Audit-Trail fuer versendete Benachrichtigungen.
-- ============================================================================

CREATE TABLE frist_benachrichtigungen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  frist_id uuid NOT NULL REFERENCES vorgang_fristen(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ampel_status text NOT NULL,  -- 'gelb', 'rot'
  gesendet_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE frist_benachrichtigungen IS 'Service-Only: Duplikat-Schutz und Audit-Trail fuer Frist-E-Mail-Benachrichtigungen (ADR-018). Zugriff nur ueber Service-Role-Key.';
COMMENT ON COLUMN frist_benachrichtigungen.ampel_status IS 'Ampelstatus bei Versand: gelb oder rot.';
COMMENT ON COLUMN frist_benachrichtigungen.gesendet_at IS 'Zeitpunkt des erfolgreichen E-Mail-Versands.';

-- Unique Index: Max. 1 Benachrichtigung pro Frist pro User pro Ampelstatus
CREATE UNIQUE INDEX idx_frist_benachrichtigung_unique
  ON frist_benachrichtigungen(frist_id, user_id, ampel_status);

-- Composite Index: Abfrage aller Benachrichtigungen eines Users im Tenant
CREATE INDEX idx_frist_benachrichtigungen_tenant_user
  ON frist_benachrichtigungen(tenant_id, user_id);

-- RLS: Service-Only (deny-all fuer alle Client-Rollen)
ALTER TABLE frist_benachrichtigungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "frist_benachrichtigungen_deny_select" ON frist_benachrichtigungen
  FOR SELECT USING (false);
CREATE POLICY "frist_benachrichtigungen_deny_insert" ON frist_benachrichtigungen
  FOR INSERT WITH CHECK (false);
CREATE POLICY "frist_benachrichtigungen_deny_update" ON frist_benachrichtigungen
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "frist_benachrichtigungen_deny_delete" ON frist_benachrichtigungen
  FOR DELETE USING (false);

-- ============================================================================
-- 2. Tabelle: config_user_benachrichtigungen (Service-Only)
-- Opt-out-Konfiguration pro Nutzer fuer E-Mail-Benachrichtigungen.
-- Prefix config_ konsistent mit bestehendem Naming-Pattern.
-- ============================================================================

CREATE TABLE config_user_benachrichtigungen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  user_id uuid NOT NULL UNIQUE,
  email_frist_gelb boolean NOT NULL DEFAULT true,
  email_frist_rot boolean NOT NULL DEFAULT true,  -- Wird fuer Referatsleiter ignoriert (AC-3)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE config_user_benachrichtigungen IS 'Service-Only: Opt-out-Konfiguration fuer E-Mail-Benachrichtigungen (ADR-018). Zugriff ueber Service-Role-Key via dedizierte API-Route.';
COMMENT ON COLUMN config_user_benachrichtigungen.email_frist_gelb IS 'Opt-out fuer Gelb-Benachrichtigungen. Default: aktiviert.';
COMMENT ON COLUMN config_user_benachrichtigungen.email_frist_rot IS 'Opt-out fuer Rot-Benachrichtigungen. Wird fuer Referatsleiter ignoriert (AC-3). Default: aktiviert.';

-- RLS: Service-Only (deny-all fuer alle Client-Rollen)
ALTER TABLE config_user_benachrichtigungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_user_benachrichtigungen_deny_select" ON config_user_benachrichtigungen
  FOR SELECT USING (false);
CREATE POLICY "config_user_benachrichtigungen_deny_insert" ON config_user_benachrichtigungen
  FOR INSERT WITH CHECK (false);
CREATE POLICY "config_user_benachrichtigungen_deny_update" ON config_user_benachrichtigungen
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "config_user_benachrichtigungen_deny_delete" ON config_user_benachrichtigungen
  FOR DELETE USING (false);

-- ============================================================================
-- 3. Trigger: updated_at auf config_user_benachrichtigungen
-- Nutzt die bestehende Funktion update_updated_at() aus PROJ-2 Migration.
-- ============================================================================

CREATE TRIGGER trg_config_user_benachrichtigungen_updated_at
  BEFORE UPDATE ON config_user_benachrichtigungen
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
