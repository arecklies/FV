-- ============================================================================
-- PROJ-3: Vorgangsverwaltung — Kern-Schema
-- Migration: 20260326120000_proj3_vorgangsverwaltung.sql
-- ADR-012 (Vorgang-Datenmodell), ADR-011 (Workflow Engine), ADR-006 (Rechtskonfiguration)
-- ADR-007 (Multi-Tenancy), ADR-003 (Service-Architektur)
--
-- Tabellen:
--   1. config_verfahrensarten (Service-Only) — Verfahrensarten je Bundesland
--   2. config_workflows (Service-Only) — Workflow-Definitionen je Verfahrensart+BL
--   3. vorgaenge (mandantenfaehig) — Kern-Tabelle
--   4. vorgang_kommentare (mandantenfaehig) — Interne Notizen (revisionssicher)
--   5. vorgang_workflow_schritte (mandantenfaehig) — Workflow-Historie
--
-- Voraussetzung: 20260326100000_proj2_mandanten_schema_rls.sql
--   (tenants, tenant_members, audit_log, get_tenant_id(), update_updated_at())
-- ============================================================================


-- ============================================================================
-- 1. Tabelle: config_verfahrensarten (Service-Only)
-- ADR-006: Verfahrensarten als konfigurierbare Datensaetze je Bundesland
-- ============================================================================

CREATE TABLE config_verfahrensarten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundesland text NOT NULL,
  kuerzel text NOT NULL,              -- z.B. 'BG', 'BG-V', 'FR', 'VB', 'NA', 'AB'
  bezeichnung text NOT NULL,          -- z.B. 'Baugenehmigung (regulaer)'
  kategorie text NOT NULL,            -- z.B. 'genehmigung', 'freistellung', 'vorbescheid', 'sonstige'
  sortierung int NOT NULL DEFAULT 0,  -- Fuer Progressive Disclosure (Top 6 zuerst)
  aktiv boolean NOT NULL DEFAULT true,
  rechtsgrundlage text,               -- z.B. '§ 64 BauO NRW'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bundesland, kuerzel)
);

COMMENT ON TABLE config_verfahrensarten IS 'Service-Only: Verfahrensarten je Bundesland (ADR-006). Zugriff nur ueber Service-Role.';
COMMENT ON COLUMN config_verfahrensarten.kuerzel IS 'Kurzbezeichner fuer Aktenzeichen-Generierung (ADR-012).';
COMMENT ON COLUMN config_verfahrensarten.sortierung IS 'Progressive Disclosure: niedrigere Werte erscheinen zuerst (PROJ-3 US-1 AC-1).';

-- RLS: Service-Only (deny-all fuer Client-Rollen)
ALTER TABLE config_verfahrensarten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_verfahrensarten_deny_select" ON config_verfahrensarten
  FOR SELECT USING (false);
CREATE POLICY "config_verfahrensarten_deny_insert" ON config_verfahrensarten
  FOR INSERT WITH CHECK (false);
CREATE POLICY "config_verfahrensarten_deny_update" ON config_verfahrensarten
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "config_verfahrensarten_deny_delete" ON config_verfahrensarten
  FOR DELETE USING (false);

-- Index: Lookup nach Bundesland (fuer Verfahrensart-Auswahl bei Vorgangsanlage)
CREATE INDEX idx_config_verfahrensarten_bl ON config_verfahrensarten(bundesland, aktiv, sortierung);

-- updated_at-Trigger
CREATE TRIGGER trg_config_verfahrensarten_updated_at
  BEFORE UPDATE ON config_verfahrensarten
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- 2. Tabelle: config_workflows (Service-Only)
-- ADR-011: Workflow-Definitionen als JSON pro Verfahrensart + Bundesland
-- ============================================================================

CREATE TABLE config_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verfahrensart_id uuid NOT NULL REFERENCES config_verfahrensarten(id),
  bundesland text NOT NULL,
  version int NOT NULL DEFAULT 1,
  definition jsonb NOT NULL,          -- JSON-Workflow-Definition (ADR-011 Schema)
  aktiv boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(verfahrensart_id, bundesland, version)
);

COMMENT ON TABLE config_workflows IS 'Service-Only: Workflow-Definitionen je Verfahrensart+BL (ADR-011). JSON-basierte State Machine.';
COMMENT ON COLUMN config_workflows.definition IS 'JSON gemaess ADR-011: schritte[], initialStatus, aktionen, frist, hinweis, checkliste.';

-- RLS: Service-Only (deny-all fuer Client-Rollen)
ALTER TABLE config_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_workflows_deny_select" ON config_workflows
  FOR SELECT USING (false);
CREATE POLICY "config_workflows_deny_insert" ON config_workflows
  FOR INSERT WITH CHECK (false);
CREATE POLICY "config_workflows_deny_update" ON config_workflows
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "config_workflows_deny_delete" ON config_workflows
  FOR DELETE USING (false);

-- Index: Lookup fuer aktive Workflow-Definition
CREATE INDEX idx_config_workflows_lookup ON config_workflows(verfahrensart_id, bundesland, aktiv)
  WHERE aktiv = true;

-- updated_at-Trigger
CREATE TRIGGER trg_config_workflows_updated_at
  BEFORE UPDATE ON config_workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- 3. Tabelle: vorgaenge (mandantenfaehig)
-- ADR-012: Zentrale fachliche Entitaet
-- ============================================================================

CREATE TABLE vorgaenge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),

  -- Aktenzeichen: eindeutig pro Tenant (generiert durch VerfahrenService)
  aktenzeichen text NOT NULL,

  -- Verfahrensart (Referenz auf Konfiguration)
  verfahrensart_id uuid NOT NULL REFERENCES config_verfahrensarten(id),
  bundesland text NOT NULL,

  -- Antragsteller/Bauherr (Pflichtfelder gemaess PROJ-3 US-1 AC-2)
  bauherr_name text NOT NULL,
  bauherr_anschrift text,
  bauherr_telefon text,
  bauherr_email text,

  -- Grundstueck (mindestens Adresse ODER Flurstueck Pflicht — in Applikation validiert)
  grundstueck_adresse text,
  grundstueck_flurstueck text,
  grundstueck_gemarkung text,

  -- Bauvorhaben
  bezeichnung text,

  -- Workflow-Status (ADR-011: Referenz auf Schritt-ID in config_workflows JSON)
  workflow_schritt_id text NOT NULL DEFAULT 'eingegangen',

  -- Zuweisung (PROJ-3 FA-7)
  zustaendiger_user_id uuid REFERENCES auth.users(id),

  -- Metadaten
  eingangsdatum timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Soft-Delete (database.md: Soft-Delete bevorzugen bei Audit-Pflicht)
  deleted_at timestamptz,

  -- Optimistic Locking (ADR-012: parallele Bearbeitung, PROJ-3 FA-10)
  version int NOT NULL DEFAULT 1,

  -- Erweiterungsfelder fuer verfahrensart-spezifische Daten (ADR-012)
  extra_felder jsonb NOT NULL DEFAULT '{}',

  UNIQUE(tenant_id, aktenzeichen)
);

COMMENT ON TABLE vorgaenge IS 'Mandantenfaehig: Bauverfahren (ADR-012). RLS ueber get_tenant_id(). Soft-Delete.';
COMMENT ON COLUMN vorgaenge.workflow_schritt_id IS 'Aktueller Workflow-Schritt (ADR-011). Referenziert Schritt-ID aus config_workflows.definition.';
COMMENT ON COLUMN vorgaenge.version IS 'Optimistic Locking: Client sendet version bei UPDATE, Server prueft Gleichheit.';
COMMENT ON COLUMN vorgaenge.extra_felder IS 'Verfahrensart-spezifische Felder (ADR-012). Validierung via Zod-Schema pro Verfahrensart.';

-- RLS: Mandantenfaehig (ADR-007 Template mit Soft-Delete-Filter auf SELECT)
ALTER TABLE vorgaenge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vorgaenge_tenant_select" ON vorgaenge
  FOR SELECT USING (tenant_id = get_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "vorgaenge_tenant_insert" ON vorgaenge
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "vorgaenge_tenant_update" ON vorgaenge
  FOR UPDATE USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

-- DELETE-Policy: Soft-Delete via UPDATE auf deleted_at (kein harter DELETE durch Client)
-- Harter DELETE nur ueber Service-Role bei Datenbereinigung
CREATE POLICY "vorgaenge_tenant_delete" ON vorgaenge
  FOR DELETE USING (tenant_id = get_tenant_id());

-- Indizes (ADR-012)

-- Primaer-Lookups
CREATE INDEX idx_vorgaenge_tenant ON vorgaenge(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vorgaenge_aktenzeichen ON vorgaenge(tenant_id, aktenzeichen);

-- Vorgangsliste: Sortierung und Filterung (PROJ-3 US-2)
CREATE INDEX idx_vorgaenge_status ON vorgaenge(tenant_id, workflow_schritt_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_vorgaenge_zustaendig ON vorgaenge(tenant_id, zustaendiger_user_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_vorgaenge_eingangsdatum ON vorgaenge(tenant_id, eingangsdatum DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_vorgaenge_verfahrensart ON vorgaenge(tenant_id, verfahrensart_id)
  WHERE deleted_at IS NULL;

-- Volltextsuche (PROJ-3 FA-6: Aktenzeichen, Adresse, Name, Flurstueck, Bezeichnung)
CREATE INDEX idx_vorgaenge_search ON vorgaenge USING gin(
  to_tsvector('german',
    coalesce(aktenzeichen, '') || ' ' ||
    coalesce(bauherr_name, '') || ' ' ||
    coalesce(grundstueck_adresse, '') || ' ' ||
    coalesce(grundstueck_flurstueck, '') || ' ' ||
    coalesce(bezeichnung, ''))
) WHERE deleted_at IS NULL;

-- updated_at-Trigger
CREATE TRIGGER trg_vorgaenge_updated_at
  BEFORE UPDATE ON vorgaenge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- 4. Tabelle: vorgang_kommentare (mandantenfaehig, revisionssicher)
-- PROJ-3 FA-9, US-4: Interne Notizen pro Vorgang
-- Kein UPDATE, kein DELETE — Kommentare sind unveraenderlich
-- ============================================================================

CREATE TABLE vorgang_kommentare (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL REFERENCES vorgaenge(id) ON DELETE CASCADE,
  autor_user_id uuid NOT NULL REFERENCES auth.users(id),
  inhalt text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
  -- Kein updated_at: Kommentare sind unveraenderlich (Revisionssicherheit, PROJ-3 US-4 AC-4)
  -- Kein deleted_at: Kommentare koennen nicht geloescht werden
);

COMMENT ON TABLE vorgang_kommentare IS 'Mandantenfaehig: Interne Notizen (PROJ-3 FA-9). Unveraenderlich (nur INSERT, kein UPDATE/DELETE).';

-- RLS: Mandantenfaehig — NUR SELECT + INSERT (Revisionssicherheit)
ALTER TABLE vorgang_kommentare ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vorgang_kommentare_tenant_select" ON vorgang_kommentare
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "vorgang_kommentare_tenant_insert" ON vorgang_kommentare
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

-- Kein UPDATE-Policy: Kommentare sind unveraenderlich
-- Kein DELETE-Policy: Kommentare koennen nicht geloescht werden
-- (deny-all ist PostgreSQL-Default bei fehlender Policy)

-- Indizes
CREATE INDEX idx_vorgang_kommentare_tenant ON vorgang_kommentare(tenant_id);
CREATE INDEX idx_vorgang_kommentare_vorgang ON vorgang_kommentare(vorgang_id, created_at);


-- ============================================================================
-- 5. Tabelle: vorgang_workflow_schritte (mandantenfaehig)
-- ADR-011: Workflow-Historie — protokolliert jeden Schritt-Uebergang
-- ============================================================================

CREATE TABLE vorgang_workflow_schritte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL REFERENCES vorgaenge(id) ON DELETE CASCADE,
  schritt_id text NOT NULL,              -- z.B. 'vollstaendigkeitspruefung'
  aktion_id text,                        -- z.B. 'vollstaendig' (NULL bei initialem Schritt)
  begruendung text,                      -- Bei Ueberspringen: Pflichtfeld (ADR-011 Experten-Modus)
  uebersprungen boolean NOT NULL DEFAULT false,
  ausgefuehrt_von uuid REFERENCES auth.users(id),
  ausgefuehrt_am timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE vorgang_workflow_schritte IS 'Mandantenfaehig: Workflow-Schritt-Historie (ADR-011). Protokolliert Uebergaenge und Ueberspringungen.';
COMMENT ON COLUMN vorgang_workflow_schritte.begruendung IS 'Pflichtfeld wenn uebersprungen=true (ADR-011 Experten-Modus).';

-- RLS: Mandantenfaehig — SELECT + INSERT (Historie ist append-only)
ALTER TABLE vorgang_workflow_schritte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vorgang_workflow_schritte_tenant_select" ON vorgang_workflow_schritte
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "vorgang_workflow_schritte_tenant_insert" ON vorgang_workflow_schritte
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

-- Kein UPDATE/DELETE: Workflow-Historie ist unveraenderlich (Audit-Pflicht)

-- Indizes
CREATE INDEX idx_vorgang_workflow_schritte_tenant ON vorgang_workflow_schritte(tenant_id);
CREATE INDEX idx_vorgang_workflow_schritte_vorgang ON vorgang_workflow_schritte(vorgang_id, ausgefuehrt_am);
