-- ============================================================================
-- Step 1 (idempotent): Erstellt alle Tabellen nur wenn sie noch nicht existieren
-- Bei "already exists" Fehlern: einfach ignorieren und weiter
-- ============================================================================

-- 1. user_role Enum
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('sachbearbeiter', 'referatsleiter', 'amtsleiter', 'tenant_admin', 'platform_admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. tenants
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  bundesland text NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "tenants_deny_select" ON tenants FOR SELECT USING (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "tenants_deny_insert" ON tenants FOR INSERT WITH CHECK (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "tenants_deny_update" ON tenants FOR UPDATE USING (false) WITH CHECK (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "tenants_deny_delete" ON tenants FOR DELETE USING (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. tenant_members
CREATE TABLE IF NOT EXISTS tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'sachbearbeiter',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "tenant_members_deny_select" ON tenant_members FOR SELECT USING (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "tenant_members_deny_insert" ON tenant_members FOR INSERT WITH CHECK (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "tenant_members_deny_update" ON tenant_members FOR UPDATE USING (false) WITH CHECK (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "tenant_members_deny_delete" ON tenant_members FOR DELETE USING (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_id ON tenant_members(tenant_id);

-- 4. audit_log
CREATE TABLE IF NOT EXISTS audit_log (
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
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "audit_log_deny_select" ON audit_log FOR SELECT USING (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "audit_log_deny_insert" ON audit_log FOR INSERT WITH CHECK (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "audit_log_deny_update" ON audit_log FOR UPDATE USING (false) WITH CHECK (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "audit_log_deny_delete" ON audit_log FOR DELETE USING (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);

-- 5. update_updated_at + get_tenant_id
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenants_updated_at ON tenants;
CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION get_tenant_id() RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('request.jwt.claims', true)::json->>'tenant_id', '')::uuid;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 6. config_verfahrensarten
CREATE TABLE IF NOT EXISTS config_verfahrensarten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundesland text NOT NULL,
  kuerzel text NOT NULL,
  bezeichnung text NOT NULL,
  kategorie text NOT NULL,
  sortierung int NOT NULL DEFAULT 0,
  aktiv boolean NOT NULL DEFAULT true,
  rechtsgrundlage text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bundesland, kuerzel)
);
ALTER TABLE config_verfahrensarten ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "config_verfahrensarten_deny_select" ON config_verfahrensarten FOR SELECT USING (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "config_verfahrensarten_deny_insert" ON config_verfahrensarten FOR INSERT WITH CHECK (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "config_verfahrensarten_deny_update" ON config_verfahrensarten FOR UPDATE USING (false) WITH CHECK (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "config_verfahrensarten_deny_delete" ON config_verfahrensarten FOR DELETE USING (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_config_verfahrensarten_bl ON config_verfahrensarten(bundesland, aktiv, sortierung);
DROP TRIGGER IF EXISTS trg_config_verfahrensarten_updated_at ON config_verfahrensarten;
CREATE TRIGGER trg_config_verfahrensarten_updated_at BEFORE UPDATE ON config_verfahrensarten FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. config_workflows
CREATE TABLE IF NOT EXISTS config_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verfahrensart_id uuid NOT NULL REFERENCES config_verfahrensarten(id),
  bundesland text NOT NULL,
  version int NOT NULL DEFAULT 1,
  definition jsonb NOT NULL,
  aktiv boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(verfahrensart_id, bundesland, version)
);
ALTER TABLE config_workflows ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "config_workflows_deny_select" ON config_workflows FOR SELECT USING (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "config_workflows_deny_insert" ON config_workflows FOR INSERT WITH CHECK (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "config_workflows_deny_update" ON config_workflows FOR UPDATE USING (false) WITH CHECK (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "config_workflows_deny_delete" ON config_workflows FOR DELETE USING (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_config_workflows_lookup ON config_workflows(verfahrensart_id, bundesland, aktiv) WHERE aktiv = true;
DROP TRIGGER IF EXISTS trg_config_workflows_updated_at ON config_workflows;
CREATE TRIGGER trg_config_workflows_updated_at BEFORE UPDATE ON config_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 8. vorgaenge
CREATE TABLE IF NOT EXISTS vorgaenge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  aktenzeichen text NOT NULL,
  verfahrensart_id uuid NOT NULL REFERENCES config_verfahrensarten(id),
  bundesland text NOT NULL,
  bauherr_name text NOT NULL,
  bauherr_anschrift text,
  bauherr_telefon text,
  bauherr_email text,
  grundstueck_adresse text,
  grundstueck_flurstueck text,
  grundstueck_gemarkung text,
  bezeichnung text,
  workflow_schritt_id text NOT NULL DEFAULT 'eingegangen',
  zustaendiger_user_id uuid REFERENCES auth.users(id),
  eingangsdatum timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version int NOT NULL DEFAULT 1,
  extra_felder jsonb NOT NULL DEFAULT '{}',
  UNIQUE(tenant_id, aktenzeichen)
);
ALTER TABLE vorgaenge ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "vorgaenge_tenant_select" ON vorgaenge FOR SELECT USING (tenant_id = get_tenant_id() AND deleted_at IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "vorgaenge_tenant_insert" ON vorgaenge FOR INSERT WITH CHECK (tenant_id = get_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "vorgaenge_tenant_update" ON vorgaenge FOR UPDATE USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "vorgaenge_tenant_delete" ON vorgaenge FOR DELETE USING (tenant_id = get_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_vorgaenge_tenant ON vorgaenge(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vorgaenge_aktenzeichen ON vorgaenge(tenant_id, aktenzeichen);
CREATE INDEX IF NOT EXISTS idx_vorgaenge_status ON vorgaenge(tenant_id, workflow_schritt_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vorgaenge_zustaendig ON vorgaenge(tenant_id, zustaendiger_user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vorgaenge_eingangsdatum ON vorgaenge(tenant_id, eingangsdatum DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vorgaenge_verfahrensart ON vorgaenge(tenant_id, verfahrensart_id) WHERE deleted_at IS NULL;
DROP TRIGGER IF EXISTS trg_vorgaenge_updated_at ON vorgaenge;
CREATE TRIGGER trg_vorgaenge_updated_at BEFORE UPDATE ON vorgaenge FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 9. vorgang_kommentare
CREATE TABLE IF NOT EXISTS vorgang_kommentare (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL REFERENCES vorgaenge(id) ON DELETE CASCADE,
  autor_user_id uuid NOT NULL REFERENCES auth.users(id),
  inhalt text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE vorgang_kommentare ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "vorgang_kommentare_tenant_select" ON vorgang_kommentare FOR SELECT USING (tenant_id = get_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "vorgang_kommentare_tenant_insert" ON vorgang_kommentare FOR INSERT WITH CHECK (tenant_id = get_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_vorgang_kommentare_tenant ON vorgang_kommentare(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vorgang_kommentare_vorgang ON vorgang_kommentare(vorgang_id, created_at);

-- 10. vorgang_workflow_schritte
CREATE TABLE IF NOT EXISTS vorgang_workflow_schritte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL REFERENCES vorgaenge(id) ON DELETE CASCADE,
  schritt_id text NOT NULL,
  aktion_id text,
  begruendung text,
  uebersprungen boolean NOT NULL DEFAULT false,
  ausgefuehrt_von uuid REFERENCES auth.users(id),
  ausgefuehrt_am timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE vorgang_workflow_schritte ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "vorgang_workflow_schritte_tenant_select" ON vorgang_workflow_schritte FOR SELECT USING (tenant_id = get_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "vorgang_workflow_schritte_tenant_insert" ON vorgang_workflow_schritte FOR INSERT WITH CHECK (tenant_id = get_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_vorgang_workflow_schritte_tenant ON vorgang_workflow_schritte(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vorgang_workflow_schritte_vorgang ON vorgang_workflow_schritte(vorgang_id, ausgefuehrt_am);

-- 11. config_fristen
CREATE TABLE IF NOT EXISTS config_fristen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundesland text NOT NULL,
  verfahrensart_id uuid NOT NULL REFERENCES config_verfahrensarten(id),
  typ text NOT NULL,
  bezeichnung text NOT NULL,
  werktage int CHECK (werktage > 0),
  rechtsgrundlage text,
  aktiv boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bundesland, verfahrensart_id, typ)
);
ALTER TABLE config_fristen ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "config_fristen_deny_select" ON config_fristen FOR SELECT USING (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "config_fristen_deny_insert" ON config_fristen FOR INSERT WITH CHECK (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "config_fristen_deny_update" ON config_fristen FOR UPDATE USING (false) WITH CHECK (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "config_fristen_deny_delete" ON config_fristen FOR DELETE USING (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_config_fristen_bl_aktiv ON config_fristen(bundesland, aktiv) WHERE aktiv = true;
CREATE INDEX IF NOT EXISTS idx_config_fristen_verfahrensart ON config_fristen(verfahrensart_id, aktiv) WHERE aktiv = true;
DROP TRIGGER IF EXISTS trg_config_fristen_updated_at ON config_fristen;
CREATE TRIGGER trg_config_fristen_updated_at BEFORE UPDATE ON config_fristen FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 12. config_feiertage
CREATE TABLE IF NOT EXISTS config_feiertage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundesland text,
  datum date NOT NULL,
  bezeichnung text NOT NULL,
  jahr int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_config_feiertage_unique ON config_feiertage(COALESCE(bundesland, '__BUND__'), datum);
ALTER TABLE config_feiertage ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "config_feiertage_deny_select" ON config_feiertage FOR SELECT USING (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "config_feiertage_deny_insert" ON config_feiertage FOR INSERT WITH CHECK (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "config_feiertage_deny_update" ON config_feiertage FOR UPDATE USING (false) WITH CHECK (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "config_feiertage_deny_delete" ON config_feiertage FOR DELETE USING (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_config_feiertage_bl_jahr ON config_feiertage(COALESCE(bundesland, '__BUND__'), jahr);
CREATE INDEX IF NOT EXISTS idx_config_feiertage_datum ON config_feiertage(datum);

-- 13. vorgang_fristen
CREATE TABLE IF NOT EXISTS vorgang_fristen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL REFERENCES vorgaenge(id) ON DELETE CASCADE,
  typ text NOT NULL,
  bezeichnung text NOT NULL,
  start_datum timestamptz NOT NULL,
  end_datum timestamptz NOT NULL,
  werktage int NOT NULL,
  status text NOT NULL DEFAULT 'gruen' CHECK (status IN ('gruen', 'gelb', 'rot', 'dunkelrot', 'gehemmt', 'pausiert')),
  gehemmt boolean NOT NULL DEFAULT false,
  hemmung_grund text,
  hemmung_start timestamptz,
  hemmung_ende timestamptz,
  hemmung_tage int DEFAULT 0,
  verlaengert boolean NOT NULL DEFAULT false,
  verlaengerung_grund text,
  original_end_datum timestamptz,
  aktiv boolean NOT NULL DEFAULT true,
  bundesland text NOT NULL DEFAULT 'NW',
  gelb_ab integer,
  rot_ab integer,
  pause_tage_gesamt int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE vorgang_fristen ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "vorgang_fristen_tenant_select" ON vorgang_fristen FOR SELECT USING (tenant_id = get_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "vorgang_fristen_tenant_insert" ON vorgang_fristen FOR INSERT WITH CHECK (tenant_id = get_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "vorgang_fristen_tenant_update" ON vorgang_fristen FOR UPDATE USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "vorgang_fristen_tenant_delete" ON vorgang_fristen FOR DELETE USING (tenant_id = get_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_vorgang_fristen_tenant ON vorgang_fristen(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vorgang_fristen_vorgang ON vorgang_fristen(vorgang_id);
CREATE INDEX IF NOT EXISTS idx_vorgang_fristen_ampel ON vorgang_fristen(tenant_id, aktiv, status, end_datum) WHERE aktiv = true;
CREATE INDEX IF NOT EXISTS idx_vorgang_fristen_bundesland ON vorgang_fristen(bundesland, aktiv) WHERE aktiv = true AND gehemmt = false AND status != 'pausiert';
DROP TRIGGER IF EXISTS trg_vorgang_fristen_updated_at ON vorgang_fristen;
CREATE TRIGGER trg_vorgang_fristen_updated_at BEFORE UPDATE ON vorgang_fristen FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 14. config_ampel_schwellenwerte (PROJ-34) -- gelb_ab/rot_ab auf config_fristen
ALTER TABLE config_fristen ADD COLUMN IF NOT EXISTS gelb_ab integer;
ALTER TABLE config_fristen ADD COLUMN IF NOT EXISTS rot_ab integer;
DO $$ BEGIN ALTER TABLE config_fristen ADD CONSTRAINT chk_gelb_groesser_rot CHECK (gelb_ab IS NULL OR rot_ab IS NULL OR gelb_ab > rot_ab); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 15. freigabe_stellvertreter (PROJ-35)
CREATE TABLE IF NOT EXISTS freigabe_stellvertreter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vertretener_id uuid NOT NULL,
  stellvertreter_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_stellvertreter_vertretener FOREIGN KEY (tenant_id, vertretener_id) REFERENCES tenant_members(tenant_id, user_id) ON DELETE CASCADE,
  CONSTRAINT fk_stellvertreter_stellvertreter FOREIGN KEY (tenant_id, stellvertreter_id) REFERENCES tenant_members(tenant_id, user_id) ON DELETE CASCADE,
  CONSTRAINT uq_stellvertreter_zuordnung UNIQUE(tenant_id, vertretener_id, stellvertreter_id),
  CONSTRAINT chk_keine_selbstvertretung CHECK(vertretener_id != stellvertreter_id)
);
ALTER TABLE freigabe_stellvertreter ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "freigabe_stellvertreter_deny_select" ON freigabe_stellvertreter FOR SELECT USING (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "freigabe_stellvertreter_deny_insert" ON freigabe_stellvertreter FOR INSERT WITH CHECK (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "freigabe_stellvertreter_deny_update" ON freigabe_stellvertreter FOR UPDATE USING (false) WITH CHECK (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "freigabe_stellvertreter_deny_delete" ON freigabe_stellvertreter FOR DELETE USING (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_freigabe_stellvertreter_lookup ON freigabe_stellvertreter(tenant_id, stellvertreter_id);
CREATE INDEX IF NOT EXISTS idx_freigabe_stellvertreter_vertretener ON freigabe_stellvertreter(tenant_id, vertretener_id);

-- 16. vertretung_fuer auf workflow_schritte (PROJ-35)
ALTER TABLE vorgang_workflow_schritte ADD COLUMN IF NOT EXISTS vertretung_fuer uuid;

-- 17. vorgang_pausen (PROJ-37)
CREATE TABLE IF NOT EXISTS vorgang_pausen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL REFERENCES vorgaenge(id) ON DELETE CASCADE,
  begruendung text NOT NULL,
  pause_start timestamptz NOT NULL DEFAULT now(),
  pause_ende timestamptz,
  pause_werktage int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE vorgang_pausen ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "vorgang_pausen_tenant_select" ON vorgang_pausen FOR SELECT USING (tenant_id = get_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "vorgang_pausen_tenant_insert" ON vorgang_pausen FOR INSERT WITH CHECK (tenant_id = get_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "vorgang_pausen_tenant_update" ON vorgang_pausen FOR UPDATE USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "vorgang_pausen_tenant_delete" ON vorgang_pausen FOR DELETE USING (tenant_id = get_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_vorgang_pausen_offen ON vorgang_pausen(vorgang_id) WHERE pause_ende IS NULL;
CREATE INDEX IF NOT EXISTS idx_vorgang_pausen_tenant ON vorgang_pausen(tenant_id);
DROP TRIGGER IF EXISTS trg_vorgang_pausen_updated_at ON vorgang_pausen;
CREATE TRIGGER trg_vorgang_pausen_updated_at BEFORE UPDATE ON vorgang_pausen FOR EACH ROW EXECUTE FUNCTION update_updated_at();

SELECT 'Step 1 fertig — alle Tabellen erstellt.' AS status;
