-- Step 3c (idempotent): BW-Geltungsdauer + PROJ-7 + background_jobs + xbau_version

-- BW Geltungsdauer
INSERT INTO config_fristen (bundesland, verfahrensart_id, typ, bezeichnung, kalendertage, rechtsgrundlage) VALUES
  ('BW', 'b1000000-0000-4000-8000-000000000002', 'geltungsdauer', 'Geltungsdauer Baugenehmigung',  1095, '§ 62 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000003', 'geltungsdauer', 'Geltungsdauer Baugenehmigung',  1095, '§ 62 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000004', 'geltungsdauer', 'Geltungsdauer Bauvorbescheid',  1095, '§ 62 LBO BW')
ON CONFLICT (bundesland, verfahrensart_id, typ) DO NOTHING;

-- xbau_nachrichten
CREATE TABLE IF NOT EXISTS xbau_nachrichten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  nachrichten_uuid uuid NOT NULL,
  nachrichtentyp text NOT NULL,
  richtung text NOT NULL CHECK (richtung IN ('eingang', 'ausgang')),
  status text NOT NULL DEFAULT 'empfangen' CHECK (status IN ('empfangen', 'verarbeitet', 'abgewiesen', 'generiert', 'heruntergeladen')),
  vorgang_id uuid REFERENCES vorgaenge(id),
  referenz_uuid uuid,
  bezug_nachrichten_uuid uuid,
  bezug_aktenzeichen text,
  absender_behoerde text,
  empfaenger_behoerde text,
  roh_xml text NOT NULL,
  kerndaten jsonb NOT NULL DEFAULT '{}',
  fehler_details jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, nachrichten_uuid)
);
ALTER TABLE xbau_nachrichten ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "xbau_nachrichten_deny_select" ON xbau_nachrichten FOR SELECT USING (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "xbau_nachrichten_deny_insert" ON xbau_nachrichten FOR INSERT WITH CHECK (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "xbau_nachrichten_deny_update" ON xbau_nachrichten FOR UPDATE USING (false) WITH CHECK (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "xbau_nachrichten_deny_delete" ON xbau_nachrichten FOR DELETE USING (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_xbau_nachrichten_vorgang ON xbau_nachrichten(tenant_id, vorgang_id, created_at DESC) WHERE vorgang_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_xbau_nachrichten_referenz ON xbau_nachrichten(tenant_id, referenz_uuid) WHERE referenz_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_xbau_nachrichten_status ON xbau_nachrichten(tenant_id, status);
DROP TRIGGER IF EXISTS trg_xbau_nachrichten_updated_at ON xbau_nachrichten;
CREATE TRIGGER trg_xbau_nachrichten_updated_at BEFORE UPDATE ON xbau_nachrichten FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- config_xbau_codelisten
CREATE TABLE IF NOT EXISTS config_xbau_codelisten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codeliste text NOT NULL,
  xbau_code text NOT NULL,
  db_code text,
  bezeichnung text NOT NULL,
  list_uri text NOT NULL,
  list_version_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(codeliste, xbau_code)
);
ALTER TABLE config_xbau_codelisten ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "config_xbau_codelisten_deny_select" ON config_xbau_codelisten FOR SELECT USING (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "config_xbau_codelisten_deny_insert" ON config_xbau_codelisten FOR INSERT WITH CHECK (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "config_xbau_codelisten_deny_update" ON config_xbau_codelisten FOR UPDATE USING (false) WITH CHECK (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "config_xbau_codelisten_deny_delete" ON config_xbau_codelisten FOR DELETE USING (false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_config_xbau_codelisten_db_code ON config_xbau_codelisten(codeliste, db_code) WHERE db_code IS NOT NULL;
DROP TRIGGER IF EXISTS trg_config_xbau_codelisten_updated_at ON config_xbau_codelisten;
CREATE TRIGGER trg_config_xbau_codelisten_updated_at BEFORE UPDATE ON config_xbau_codelisten FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- xbau_code auf config_verfahrensarten
ALTER TABLE config_verfahrensarten ADD COLUMN IF NOT EXISTS xbau_code text;
CREATE INDEX IF NOT EXISTS idx_config_verfahrensarten_xbau ON config_verfahrensarten(xbau_code, bundesland) WHERE xbau_code IS NOT NULL;

-- background_jobs (bereits in step1 erstellt, nur fehlende Spalten ergaenzen)
-- Tabelle existiert schon — nur neue Spalten aus ADR-015 hinzufuegen falls fehlend
ALTER TABLE background_jobs ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;
ALTER TABLE background_jobs ADD COLUMN IF NOT EXISTS webhook_url text;
ALTER TABLE background_jobs ADD COLUMN IF NOT EXISTS webhook_delivered boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_background_jobs_worker_poll ON background_jobs(tenant_id, status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_background_jobs_type_status ON background_jobs(tenant_id, type, status);

-- xbau_version auf tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS xbau_version text NOT NULL DEFAULT '2.6';

SELECT 'Step 3c fertig — alle Tabellen und Spalten erstellt.' AS status;
