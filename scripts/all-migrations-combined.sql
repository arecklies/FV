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
-- ============================================================================
-- PROJ-4: Fristmanagement — Schema fuer Fristen, Feiertage, Background Jobs
-- Migration: 20260326140000_proj4_fristmanagement.sql
-- ADR-012 (vorgang_fristen), ADR-006 (config_fristen), ADR-008 (background_jobs)
-- ADR-007 (Multi-Tenancy), ADR-003 (Service-Architektur)
--
-- Tabellen:
--   1. config_fristen (Service-Only) — Gesetzliche Fristen je BL + Verfahrensart
--   2. config_feiertage (Service-Only) — Feiertage je BL (+ bundesweite)
--   3. vorgang_fristen (mandantenfaehig) — Konkrete Fristen pro Vorgang
--   4. background_jobs (Service-Only) — Asynchrone Job-Queue (ADR-008)
--
-- Voraussetzungen:
--   20260326100000_proj2_mandanten_schema_rls.sql (tenants, get_tenant_id(), update_updated_at())
--   20260326120000_proj3_vorgangsverwaltung.sql (config_verfahrensarten, vorgaenge)
-- ============================================================================


-- ============================================================================
-- 1. Tabelle: config_fristen (Service-Only)
-- ADR-006: Gesetzliche Fristen als konfigurierbare Datensaetze je Bundesland
-- ============================================================================

CREATE TABLE config_fristen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundesland text NOT NULL,
  verfahrensart_id uuid NOT NULL REFERENCES config_verfahrensarten(id),

  -- Fristtyp: gesamtfrist, beteiligungsfrist, nachforderungsfrist, etc.
  typ text NOT NULL,
  bezeichnung text NOT NULL,

  -- Fristdauer in Werktagen (FA-3: Werktage-Berechnung)
  werktage int NOT NULL CHECK (werktage > 0),

  -- Rechtsgrundlage (z.B. '§ 75 Abs. 1 BauO NRW')
  rechtsgrundlage text,

  aktiv boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Pro Bundesland und Verfahrensart gibt es genau einen Fristtyp
  UNIQUE(bundesland, verfahrensart_id, typ)
);

COMMENT ON TABLE config_fristen IS 'Service-Only: Gesetzliche Fristen je Bundesland und Verfahrensart (ADR-006). Zugriff nur ueber Service-Role.';
COMMENT ON COLUMN config_fristen.typ IS 'Fristtyp: gesamtfrist, beteiligungsfrist, nachforderungsfrist, widerspruchsfrist, etc.';
COMMENT ON COLUMN config_fristen.werktage IS 'Fristdauer in Werktagen. Wochenenden und Feiertage werden bei Berechnung uebersprungen.';
COMMENT ON COLUMN config_fristen.rechtsgrundlage IS 'Gesetzliche Grundlage, z.B. "§ 75 Abs. 1 BauO NRW".';

-- RLS: Service-Only (deny-all fuer Client-Rollen)
ALTER TABLE config_fristen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_fristen_deny_select" ON config_fristen
  FOR SELECT USING (false);
CREATE POLICY "config_fristen_deny_insert" ON config_fristen
  FOR INSERT WITH CHECK (false);
CREATE POLICY "config_fristen_deny_update" ON config_fristen
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "config_fristen_deny_delete" ON config_fristen
  FOR DELETE USING (false);

-- Index: Lookup nach Bundesland + aktiv (Fristberechnung bei Vorgangsanlage)
CREATE INDEX idx_config_fristen_bl_aktiv ON config_fristen(bundesland, aktiv)
  WHERE aktiv = true;

-- Index: Lookup nach Verfahrensart (Fristen fuer eine bestimmte Verfahrensart)
CREATE INDEX idx_config_fristen_verfahrensart ON config_fristen(verfahrensart_id, aktiv)
  WHERE aktiv = true;

-- updated_at-Trigger
CREATE TRIGGER trg_config_fristen_updated_at
  BEFORE UPDATE ON config_fristen
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- 2. Tabelle: config_feiertage (Service-Only)
-- Feiertage je Bundesland + bundesweite Feiertage
-- Fuer Werktage-Berechnung (PROJ-4 FA-3, NFR-2)
-- ============================================================================

CREATE TABLE config_feiertage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULL = bundesweiter Feiertag, sonst BL-Kuerzel (z.B. 'NW', 'BY')
  bundesland text,

  datum date NOT NULL,
  bezeichnung text NOT NULL,

  -- Jahr fuer einfache Abfragen und jaehrliche Aktualisierung
  jahr int NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- UNIQUE mit COALESCE: NULL-Bundesland wird als '__BUND__' behandelt
-- Damit gilt: pro (Bundesland ODER bundesweit) + Datum genau ein Eintrag
CREATE UNIQUE INDEX idx_config_feiertage_unique ON config_feiertage(COALESCE(bundesland, '__BUND__'), datum);

COMMENT ON TABLE config_feiertage IS 'Service-Only: Feiertage je Bundesland und bundesweit. Fuer Werktage-Berechnung (PROJ-4 FA-3).';
COMMENT ON COLUMN config_feiertage.bundesland IS 'NULL = bundesweiter Feiertag. BL-Kuerzel (z.B. NW, BY) = landesspezifischer Feiertag.';
COMMENT ON COLUMN config_feiertage.jahr IS 'Jahr fuer einfache Abfragen und jaehrliche Aktualisierung.';

-- RLS: Service-Only (deny-all fuer Client-Rollen)
ALTER TABLE config_feiertage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_feiertage_deny_select" ON config_feiertage
  FOR SELECT USING (false);
CREATE POLICY "config_feiertage_deny_insert" ON config_feiertage
  FOR INSERT WITH CHECK (false);
CREATE POLICY "config_feiertage_deny_update" ON config_feiertage
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "config_feiertage_deny_delete" ON config_feiertage
  FOR DELETE USING (false);

-- Index: Lookup nach Bundesland + Jahr (Fristberechnung: alle Feiertage eines BL in einem Jahr)
CREATE INDEX idx_config_feiertage_bl_jahr ON config_feiertage(COALESCE(bundesland, '__BUND__'), jahr);

-- Index: Lookup nach Datum (Pruefung ob ein Datum ein Feiertag ist)
CREATE INDEX idx_config_feiertage_datum ON config_feiertage(datum);


-- ============================================================================
-- 3. Tabelle: vorgang_fristen (mandantenfaehig)
-- ADR-012: Konkrete Fristen pro Vorgang mit Ampellogik und Hemmung
-- ============================================================================

CREATE TABLE vorgang_fristen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL REFERENCES vorgaenge(id) ON DELETE CASCADE,

  -- Fristtyp: gesamtfrist, beteiligungsfrist, nachforderungsfrist, etc.
  typ text NOT NULL,
  bezeichnung text NOT NULL,

  -- Fristberechnung (PROJ-4 US-1)
  start_datum timestamptz NOT NULL,
  end_datum timestamptz NOT NULL,
  werktage int NOT NULL,

  -- Ampellogik (PROJ-4 FA-4): gruen > 50%, gelb 25-50%, rot < 25% oder < 5 WT, dunkelrot ueberschritten, gehemmt
  -- Berechnet durch FristService, gespeichert fuer performante Abfragen (Dashboard, Vorgangsliste)
  status text NOT NULL DEFAULT 'gruen'
    CHECK (status IN ('gruen', 'gelb', 'rot', 'dunkelrot', 'gehemmt')),

  -- Hemmung (PROJ-4 US-5)
  gehemmt boolean NOT NULL DEFAULT false,
  hemmung_grund text,
  hemmung_start timestamptz,
  hemmung_ende timestamptz,
  hemmung_tage int DEFAULT 0,

  -- Verlaengerung (PROJ-4 US-4)
  verlaengert boolean NOT NULL DEFAULT false,
  verlaengerung_grund text,
  original_end_datum timestamptz,

  aktiv boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE vorgang_fristen IS 'Mandantenfaehig: Konkrete Fristen pro Vorgang (ADR-012, PROJ-4). Ampellogik, Hemmung, Verlaengerung.';
COMMENT ON COLUMN vorgang_fristen.status IS 'Ampelstatus: gruen (> 50%), gelb (25-50%), rot (< 25% oder < 5 WT), dunkelrot (ueberschritten), gehemmt.';
COMMENT ON COLUMN vorgang_fristen.gehemmt IS 'True wenn Frist aktuell gehemmt ist (z.B. Nachforderung bei Unvollstaendigkeit).';
COMMENT ON COLUMN vorgang_fristen.hemmung_tage IS 'Kumulierte Hemmungstage. Bei Aufhebung wird end_datum um diese Tage verlaengert.';
COMMENT ON COLUMN vorgang_fristen.original_end_datum IS 'Urspruengliches Enddatum vor Verlaengerung. NULL wenn nie verlaengert.';

-- RLS: Mandantenfaehig (ADR-007 Template)
ALTER TABLE vorgang_fristen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vorgang_fristen_tenant_select" ON vorgang_fristen
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "vorgang_fristen_tenant_insert" ON vorgang_fristen
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "vorgang_fristen_tenant_update" ON vorgang_fristen
  FOR UPDATE USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "vorgang_fristen_tenant_delete" ON vorgang_fristen
  FOR DELETE USING (tenant_id = get_tenant_id());

-- Indizes

-- Primaer-Lookup: Fristen eines Mandanten
CREATE INDEX idx_vorgang_fristen_tenant ON vorgang_fristen(tenant_id);

-- Fristen eines Vorgangs (Detail-Ansicht)
CREATE INDEX idx_vorgang_fristen_vorgang ON vorgang_fristen(vorgang_id);

-- Ampel-Dashboard: Aktive, nicht abgelaufene Fristen nach Status und Enddatum
-- Kritischer Index fuer PROJ-4 US-2 (Vorgangsliste) und US-3 (Referatsleiter-Dashboard)
CREATE INDEX idx_vorgang_fristen_ampel ON vorgang_fristen(tenant_id, aktiv, status, end_datum)
  WHERE aktiv = true;

-- Fristgefaehrdete Vorgaenge: Aktive Fristen sortiert nach Enddatum (naechste Frist zuerst)
CREATE INDEX idx_vorgang_fristen_dringlichkeit ON vorgang_fristen(tenant_id, end_datum ASC)
  WHERE aktiv = true AND status IN ('gelb', 'rot', 'dunkelrot');

-- updated_at-Trigger
CREATE TRIGGER trg_vorgang_fristen_updated_at
  BEFORE UPDATE ON vorgang_fristen
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- 4. Tabelle: background_jobs (Service-Only)
-- ADR-008: Asynchrone Job-Queue fuer Erinnerungen, OCR, PDF, Export
-- ============================================================================

CREATE TABLE background_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),

  -- Job-Typ: frist_erinnerung, ocr_indexierung, pdf_generation, mandanten_export
  type text NOT NULL,

  -- Job-Status: pending -> processing -> completed | failed
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  -- Job-spezifische Ein- und Ausgabedaten
  input jsonb NOT NULL DEFAULT '{}',
  output jsonb,

  -- Retry-Logik (ADR-008: max 3 Versuche, Dead-Letter bei Erreichen)
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,

  -- Zeitstempel
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,

  -- Ersteller (NULL bei system-generierten Jobs, z.B. Cron)
  created_by uuid REFERENCES auth.users(id)
);

COMMENT ON TABLE background_jobs IS 'Service-Only: Asynchrone Job-Queue (ADR-008). Zugriff nur ueber Service-Role.';
COMMENT ON COLUMN background_jobs.type IS 'Job-Typ: frist_erinnerung, ocr_indexierung, pdf_generation, mandanten_export.';
COMMENT ON COLUMN background_jobs.status IS 'Lifecycle: pending -> processing -> completed | failed. Dead-Letter bei attempts >= max_attempts.';
COMMENT ON COLUMN background_jobs.input IS 'Job-spezifische Eingabedaten (z.B. vorgang_id, frist_id, dokument_id).';
COMMENT ON COLUMN background_jobs.output IS 'Ergebnis oder Fehlerdetails nach Verarbeitung.';

-- RLS: Service-Only (deny-all fuer Client-Rollen)
-- ADR-008: Jobs werden nur ueber Service-Role gelesen/geschrieben (Backend, Worker, Cron)
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "background_jobs_deny_select" ON background_jobs
  FOR SELECT USING (false);
CREATE POLICY "background_jobs_deny_insert" ON background_jobs
  FOR INSERT WITH CHECK (false);
CREATE POLICY "background_jobs_deny_update" ON background_jobs
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "background_jobs_deny_delete" ON background_jobs
  FOR DELETE USING (false);

-- Index: Worker-Lookup (naechsten pendenden Job nach Typ finden)
CREATE INDEX idx_background_jobs_worker ON background_jobs(status, type)
  WHERE status = 'pending';

-- Index: Stuck-Job-Detection (ADR-008: Jobs die > 10 min in processing haengen)
CREATE INDEX idx_background_jobs_stuck ON background_jobs(status, started_at)
  WHERE status = 'processing';

-- Index: Tenant-spezifische Job-Abfragen (Admin-Dashboard)
CREATE INDEX idx_background_jobs_tenant ON background_jobs(tenant_id, created_at DESC);
-- ============================================================================
-- PROJ-34: Konfigurierbare Ampel-Schwellenwerte
-- Migration: 20260327100000_proj34_ampel_schwellenwerte.sql
--
-- Erweitert config_fristen um optionale Spalten gelb_ab und rot_ab (Prozent).
-- Nicht-destruktiv: ADD COLUMN, nullable, kein Datenverlust.
--
-- Voraussetzung: 20260326140000_proj4_fristmanagement.sql (config_fristen)
-- ============================================================================

-- Spalte gelb_ab: Prozent Restzeit, ab der die Ampel auf gelb wechselt (Standard: 50)
ALTER TABLE config_fristen
  ADD COLUMN gelb_ab integer CHECK (gelb_ab BETWEEN 1 AND 99);

-- Spalte rot_ab: Prozent Restzeit, ab der die Ampel auf rot wechselt (Standard: 25)
ALTER TABLE config_fristen
  ADD COLUMN rot_ab integer CHECK (rot_ab BETWEEN 1 AND 99);

-- Constraint: gelb_ab muss groesser als rot_ab sein (wenn beide gesetzt)
ALTER TABLE config_fristen
  ADD CONSTRAINT chk_gelb_groesser_rot
  CHECK (gelb_ab IS NULL OR rot_ab IS NULL OR gelb_ab > rot_ab);

COMMENT ON COLUMN config_fristen.gelb_ab IS 'Prozent Restzeit fuer Gelb-Schwelle (1-99). NULL = Standard 50%.';
COMMENT ON COLUMN config_fristen.rot_ab IS 'Prozent Restzeit fuer Rot-Schwelle (1-99). NULL = Standard 25%.';
-- ============================================================================
-- PROJ-22: Cron-Job Feiertags-Korrektheit und Batch-Optimierung
-- Migration: 20260327110000_proj22_frist_bundesland.sql
--
-- Aenderung: vorgang_fristen erhaelt Spalte `bundesland` (text NOT NULL)
-- damit der Cron-Job Feiertage je Bundesland laden kann ohne vorgaenge-Join.
--
-- Zero-Downtime: ADD COLUMN (nullable) -> Backfill -> SET NOT NULL
-- Voraussetzung: Alle vorgaenge haben bundesland befuellt (Annahme aus Spec)
-- ============================================================================

-- Step 1: Spalte hinzufuegen (nullable fuer Backfill)
ALTER TABLE vorgang_fristen ADD COLUMN bundesland text;

COMMENT ON COLUMN vorgang_fristen.bundesland IS 'Bundesland-Kuerzel (z.B. NW, BY). Wird bei Fristanlage aus vorgaenge uebernommen. Fuer Feiertags-Lookup im Cron-Job (PROJ-22).';

-- Step 2: Backfill aus vorgaenge (in Chunks a 1000 zur Lock-Vermeidung, database.md)
DO $$
DECLARE
  batch_size INT := 1000;
  updated INT := 1;
BEGIN
  WHILE updated > 0 LOOP
    WITH batch AS (
      SELECT vf.id
      FROM vorgang_fristen vf
      WHERE vf.bundesland IS NULL
      LIMIT batch_size
    )
    UPDATE vorgang_fristen vf
    SET bundesland = v.bundesland
    FROM vorgaenge v, batch b
    WHERE vf.id = b.id AND vf.vorgang_id = v.id;
    GET DIAGNOSTICS updated = ROW_COUNT;
  END LOOP;
END $$;

-- Step 3: NOT NULL Constraint setzen
ALTER TABLE vorgang_fristen ALTER COLUMN bundesland SET NOT NULL;

-- Step 4: Index fuer Cron-Job (gruppierter Lookup nach bundesland + aktiv)
CREATE INDEX idx_vorgang_fristen_bundesland ON vorgang_fristen(bundesland, aktiv)
  WHERE aktiv = true AND gehemmt = false;
-- PROJ-34 Fix: Denormalisiere gelb_ab/rot_ab auf vorgang_fristen
-- Damit kann der Cron-Job konfigurierte Schwellenwerte direkt lesen.

ALTER TABLE vorgang_fristen ADD COLUMN gelb_ab integer;
ALTER TABLE vorgang_fristen ADD COLUMN rot_ab integer;
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
-- ============================================================================
-- PROJ-48: Verlängerung der Baugenehmigung — Geltungsdauer und Verlängerungshistorie
-- Migration: 20260327200000_proj48_geltungsdauer_verlaengerung.sql
--
-- Aenderungen:
--   1. vorgaenge: ADD COLUMN geltungsdauer_bis (timestamptz, nullable)
--   2. config_fristen: ADD COLUMN kalendertage (integer, nullable), werktage DROP NOT NULL
--   3. vorgang_verlaengerungen (neu, Service-Only) — Verlängerungshistorie
--   4. config_fristen: INSERT Geltungsdauer-Einträge (NRW + BW)
--
-- Voraussetzungen:
--   20260326120000_proj3_vorgangsverwaltung.sql (vorgaenge, config_verfahrensarten)
--   20260326140000_proj4_fristmanagement.sql (config_fristen)
--   20260328100000_proj44_lbo_bw_konfiguration.sql (BW-Verfahrensarten)
--
-- Rechtsgrundlage:
--   NRW: § 75 Abs. 1 BauO NRW — Genehmigung erlischt nach 3 Jahren
--   BW:  § 62 LBO BW — Genehmigung erlischt nach 3 Jahren
--
-- Zero-Downtime: Ja (alle ADD COLUMN nullable, kein Table-Rewrite)
-- ============================================================================


-- ============================================================================
-- 1. ALTER TABLE vorgaenge: Geltungsdauer-Feld
-- ============================================================================

ALTER TABLE vorgaenge ADD COLUMN geltungsdauer_bis timestamptz;

COMMENT ON COLUMN vorgaenge.geltungsdauer_bis IS 'PROJ-48: Ablaufdatum der Baugenehmigung. Automatisch gesetzt bei Bescheidzustellung (Workflow-Schritt "zustellung"). NULL bei Kenntnisgabe und noch nicht zugestellten Vorgaengen.';

-- Partial Index: Nur Vorgaenge mit gesetzter Geltungsdauer (fuer spaetere Ablauf-Queries)
CREATE INDEX idx_vorgaenge_geltungsdauer ON vorgaenge(tenant_id, geltungsdauer_bis)
  WHERE geltungsdauer_bis IS NOT NULL;


-- ============================================================================
-- 2. ALTER TABLE config_fristen: Kalendertage-Feld + Constraint-Anpassung
-- Geltungsdauer wird in Kalendertagen gerechnet (§ 75 BauO NRW: "3 Jahre"),
-- bestehende Fristen in Werktagen. Genau eines von beiden muss gesetzt sein.
-- ============================================================================

-- 2a. Neue Spalte
ALTER TABLE config_fristen ADD COLUMN kalendertage integer;

COMMENT ON COLUMN config_fristen.kalendertage IS 'PROJ-48: Fristdauer in Kalendertagen (fuer Geltungsdauer). Mutually exclusive mit werktage: genau eines muss gesetzt sein.';

-- 2b. Bestehenden NOT NULL + CHECK auf werktage entfernen
-- (werktage war: NOT NULL CHECK (werktage > 0))
ALTER TABLE config_fristen ALTER COLUMN werktage DROP NOT NULL;
ALTER TABLE config_fristen DROP CONSTRAINT IF EXISTS config_fristen_werktage_check;

-- 2c. Neuer CHECK: Genau eines von werktage/kalendertage muss gesetzt und positiv sein
ALTER TABLE config_fristen ADD CONSTRAINT config_fristen_dauer_check
  CHECK (
    (werktage IS NOT NULL AND werktage > 0 AND kalendertage IS NULL)
    OR
    (kalendertage IS NOT NULL AND kalendertage > 0 AND werktage IS NULL)
  );


-- ============================================================================
-- 3. Neue Tabelle: vorgang_verlaengerungen (Service-Only)
-- Verlängerungshistorie je Vorgang (PROJ-48 US-3, US-4, US-5)
-- ============================================================================

CREATE TABLE vorgang_verlaengerungen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL REFERENCES vorgaenge(id) ON DELETE CASCADE,

  -- Verlängerungsdaten
  altes_datum timestamptz NOT NULL,
  neues_datum timestamptz NOT NULL,
  antragsdatum date NOT NULL,
  begruendung text NOT NULL,
  verlaengerung_tage integer NOT NULL CHECK (verlaengerung_tage > 0),

  -- Wer hat die Verlängerung erfasst?
  sachbearbeiter_id uuid NOT NULL REFERENCES auth.users(id),

  -- Metadaten
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE vorgang_verlaengerungen IS 'Service-Only: Verlängerungshistorie fuer Baugenehmigungen (PROJ-48). Zugriff nur ueber Service-Role.';
COMMENT ON COLUMN vorgang_verlaengerungen.altes_datum IS 'Geltungsdauer_bis VOR der Verlaengerung.';
COMMENT ON COLUMN vorgang_verlaengerungen.neues_datum IS 'Geltungsdauer_bis NACH der Verlaengerung.';
COMMENT ON COLUMN vorgang_verlaengerungen.antragsdatum IS 'Datum des schriftlichen Verlaengerungsantrags des Bauherrn.';
COMMENT ON COLUMN vorgang_verlaengerungen.verlaengerung_tage IS 'Verlaengerung in Kalendertagen (Standard: 365).';

-- RLS: Service-Only (deny-all fuer Client-Rollen)
ALTER TABLE vorgang_verlaengerungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vorgang_verlaengerungen_deny_select" ON vorgang_verlaengerungen
  FOR SELECT USING (false);
CREATE POLICY "vorgang_verlaengerungen_deny_insert" ON vorgang_verlaengerungen
  FOR INSERT WITH CHECK (false);
CREATE POLICY "vorgang_verlaengerungen_deny_update" ON vorgang_verlaengerungen
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "vorgang_verlaengerungen_deny_delete" ON vorgang_verlaengerungen
  FOR DELETE USING (false);

-- Index: Verlängerungen eines Vorgangs (Detail-Ansicht, chronologisch)
CREATE INDEX idx_vorgang_verlaengerungen_vorgang ON vorgang_verlaengerungen(vorgang_id, created_at DESC);

-- Index: Tenant-Lookup (Admin-Queries)
CREATE INDEX idx_vorgang_verlaengerungen_tenant ON vorgang_verlaengerungen(tenant_id);


-- ============================================================================
-- 4. Config-Daten: Geltungsdauer je Bundesland und Verfahrensart
-- Typ 'geltungsdauer' mit kalendertage (nicht werktage)
-- ============================================================================

INSERT INTO config_fristen (bundesland, verfahrensart_id, typ, bezeichnung, kalendertage, rechtsgrundlage) VALUES
  -- NRW: § 75 Abs. 1 BauO NRW — 3 Jahre
  ('NW', 'b0000000-0000-4000-8000-000000000001', 'geltungsdauer', 'Geltungsdauer Baugenehmigung',  1095, '§ 75 Abs. 1 BauO NRW'),
  ('NW', 'b0000000-0000-4000-8000-000000000002', 'geltungsdauer', 'Geltungsdauer Baugenehmigung',  1095, '§ 75 Abs. 1 BauO NRW'),
  ('NW', 'b0000000-0000-4000-8000-000000000003', 'geltungsdauer', 'Geltungsdauer Freistellung',    1095, '§ 63 Abs. 4 BauO NRW'),
  -- BW: § 62 LBO BW — 3 Jahre
  ('BW', 'b1000000-0000-4000-8000-000000000002', 'geltungsdauer', 'Geltungsdauer Baugenehmigung',  1095, '§ 62 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000003', 'geltungsdauer', 'Geltungsdauer Baugenehmigung',  1095, '§ 62 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000004', 'geltungsdauer', 'Geltungsdauer Bauvorbescheid',  1095, '§ 62 LBO BW');
  -- Kein Eintrag fuer BW Kenntnisgabe (b1000000-...-000000000001): keine Geltungsdauer


-- ============================================================================
-- Rollback (als Referenz, ausfuehren via supabase/rollbacks/):
--
-- DELETE FROM config_fristen WHERE typ = 'geltungsdauer';
-- DROP TABLE IF EXISTS vorgang_verlaengerungen CASCADE;
-- ALTER TABLE config_fristen DROP CONSTRAINT IF EXISTS config_fristen_dauer_check;
-- ALTER TABLE config_fristen DROP COLUMN IF EXISTS kalendertage;
-- ALTER TABLE config_fristen ALTER COLUMN werktage SET NOT NULL;
-- ALTER TABLE config_fristen ADD CONSTRAINT config_fristen_werktage_check CHECK (werktage > 0);
-- DROP INDEX IF EXISTS idx_vorgaenge_geltungsdauer;
-- ALTER TABLE vorgaenge DROP COLUMN IF EXISTS geltungsdauer_bis;
-- ============================================================================
-- PROJ-44: LBO Baden-Wuerttemberg Regelwerk-Konfiguration
-- Rein additive Migration (INSERT only) — kein Einfluss auf bestehende NRW-Daten
-- Rollback: supabase/rollbacks/20260328100000_proj44_lbo_bw_konfiguration_rollback.sql
--
-- Rechtsgrundlage: LBO BW in der Fassung vom 5. Maerz 2010,
-- letzte Aenderung vom 18.03.2025 (gueltig ab 28.06.2025)
-- Quelle: Input/Gesetzte/LBOs/Baden-Wuerttemberg.pdf

-- ==============================
-- 1. Verfahrensarten BW (4 Stueck)
-- ==============================
-- Reihenfolge Insert: Verfahrensarten ZUERST (FK-Abhaengigkeit von Workflows und Fristen)

INSERT INTO config_verfahrensarten (id, bundesland, kuerzel, bezeichnung, kategorie, sortierung, rechtsgrundlage) VALUES
  ('b1000000-0000-4000-8000-000000000001', 'BW', 'KG',   'Kenntnisgabeverfahren',                    'kenntnisgabe', 1, '§ 51 LBO BW'),
  ('b1000000-0000-4000-8000-000000000002', 'BW', 'BG-V', 'Baugenehmigung (vereinfacht)',              'genehmigung',  2, '§ 52 LBO BW'),
  ('b1000000-0000-4000-8000-000000000003', 'BW', 'BG',   'Baugenehmigung (regulär)',                  'genehmigung',  3, '§§ 49, 58 LBO BW'),
  ('b1000000-0000-4000-8000-000000000004', 'BW', 'VB',   'Bauvorbescheid',                            'vorbescheid',  4, '§ 57 LBO BW');

-- ==============================
-- 2. Workflow: Kenntnisgabeverfahren (BW)
-- ==============================
-- Besonderheit: Kein Genehmigungsbescheid, kein Vier-Augen-Prinzip.
-- Baubeginn nach 2 Wochen Wartefrist (§ 59 Abs. 4 LBO BW).
-- Eingangsbestaetigung innerhalb 5 AT (§ 53 Abs. 5 LBO BW).

INSERT INTO config_workflows (verfahrensart_id, bundesland, version, definition) VALUES
  ('b1000000-0000-4000-8000-000000000001', 'BW', 1, '{
    "name": "Kenntnisgabeverfahren (BW)",
    "version": 1,
    "initialStatus": "eingegangen",
    "schritte": [
      {
        "id": "eingegangen",
        "label": "Unterlagen eingegangen",
        "typ": "automatisch",
        "naechsteSchritte": ["vollstaendigkeitspruefung"],
        "aktionen": []
      },
      {
        "id": "vollstaendigkeitspruefung",
        "label": "Vollständigkeitsprüfung",
        "typ": "manuell",
        "naechsteSchritte": ["nachforderung", "baubeginn_wartefrist"],
        "aktionen": [
          {"id": "vollstaendig", "label": "Vollständig — Eingang bestätigen", "ziel": "baubeginn_wartefrist"},
          {"id": "unvollstaendig", "label": "Unvollständig — Nachforderung", "ziel": "nachforderung"}
        ],
        "frist": "eingangsbestaetigung",
        "hinweis": "Eingangsbestätigung innerhalb von 5 Arbeitstagen (§ 53 Abs. 5 LBO BW). Prüfen Sie ob alle Bauvorlagen vollständig sind.",
        "checkliste": ["Lageplan", "Bauzeichnungen", "Baubeschreibung", "Standsicherheitsnachweis", "Nachweis B-Plan-Konformität"]
      },
      {
        "id": "nachforderung",
        "label": "Nachforderung",
        "typ": "manuell",
        "naechsteSchritte": ["vollstaendigkeitspruefung"],
        "aktionen": [
          {"id": "eingegangen", "label": "Unterlagen nachgereicht", "ziel": "vollstaendigkeitspruefung"}
        ],
        "hinweis": "Bauherr wurde über fehlende Unterlagen informiert (§ 53 Abs. 6 LBO BW)."
      },
      {
        "id": "baubeginn_wartefrist",
        "label": "Baubeginn-Wartefrist",
        "typ": "manuell",
        "naechsteSchritte": ["bauausfuehrung"],
        "aktionen": [
          {"id": "frist_abgelaufen", "label": "Wartefrist abgelaufen — Baubeginn möglich", "ziel": "bauausfuehrung"}
        ],
        "frist": "baubeginn_wartefrist",
        "hinweis": "Baubeginn frühestens 2 Wochen nach Eingangsbestätigung (§ 59 Abs. 4 LBO BW). Bauherrn über Baubeginn-Berechtigung informieren."
      },
      {
        "id": "bauausfuehrung",
        "label": "Bauausführung",
        "typ": "manuell",
        "naechsteSchritte": ["abgeschlossen"],
        "aktionen": [
          {"id": "fertiggestellt", "label": "Bauvorhaben fertiggestellt", "ziel": "abgeschlossen"}
        ]
      },
      {
        "id": "abgeschlossen",
        "label": "Vorgang abgeschlossen",
        "typ": "endstatus",
        "naechsteSchritte": [],
        "aktionen": []
      }
    ]
  }'::jsonb);

-- ==============================
-- 3. Workflow: Baugenehmigung vereinfacht (BW)
-- ==============================
-- Pruefumfang eingeschraenkt (§ 52 Abs. 2 LBO BW).
-- Entscheidungsfrist 1 Monat (§ 54 Abs. 5 LBO BW).
-- Genehmigungsfiktion moeglich (§ 58 Abs. 1a LBO BW).

INSERT INTO config_workflows (verfahrensart_id, bundesland, version, definition) VALUES
  ('b1000000-0000-4000-8000-000000000002', 'BW', 1, '{
    "name": "Baugenehmigung vereinfacht (BW)",
    "version": 1,
    "initialStatus": "eingegangen",
    "schritte": [
      {"id": "eingegangen", "label": "Antrag eingegangen", "typ": "automatisch", "naechsteSchritte": ["vollstaendigkeitspruefung"], "aktionen": []},
      {"id": "vollstaendigkeitspruefung", "label": "Vollständigkeitsprüfung", "typ": "manuell", "naechsteSchritte": ["nachforderung", "beteiligung"], "aktionen": [{"id": "vollstaendig", "label": "Vollständig", "ziel": "beteiligung"}, {"id": "unvollstaendig", "label": "Unvollständig — Nachforderung", "ziel": "nachforderung"}], "frist": "vollstaendigkeitspruefung", "hinweis": "Vollständigkeit innerhalb von 10 Arbeitstagen prüfen (§ 54 Abs. 1 LBO BW).", "checkliste": ["Lageplan", "Bauzeichnungen", "Baubeschreibung", "Standsicherheitsnachweis"]},
      {"id": "nachforderung", "label": "Nachforderung", "typ": "manuell", "naechsteSchritte": ["vollstaendigkeitspruefung"], "aktionen": [{"id": "eingegangen", "label": "Unterlagen eingegangen", "ziel": "vollstaendigkeitspruefung"}], "hinweis": "Fristabläufe sind gehemmt bis Nachbesserung eingeht (§ 54 Abs. 1 Satz 3 LBO BW)."},
      {"id": "beteiligung", "label": "ToEB-Beteiligung", "typ": "manuell", "naechsteSchritte": ["pruefung"], "aktionen": [{"id": "abgeschlossen", "label": "Alle Stellungnahmen eingegangen", "ziel": "pruefung"}], "frist": "beteiligungsfrist", "hinweis": "Stellungnahmefrist max. 1 Monat (§ 54 Abs. 3 LBO BW)."},
      {"id": "pruefung", "label": "Fachliche Prüfung", "typ": "manuell", "naechsteSchritte": ["bescheid_entwurf"], "aktionen": [{"id": "genehmigen", "label": "Genehmigung empfehlen", "ziel": "bescheid_entwurf"}], "frist": "gesamtfrist", "hinweis": "Entscheidungsfrist 1 Monat (§ 54 Abs. 5 LBO BW). Achtung: Bei Fristablauf greift Genehmigungsfiktion (§ 58 Abs. 1a LBO BW)."},
      {"id": "bescheid_entwurf", "label": "Bescheid erstellen", "typ": "manuell", "naechsteSchritte": ["freizeichnung"], "aktionen": [{"id": "fertig", "label": "Bescheid erstellt — Freigabe", "ziel": "freizeichnung"}]},
      {"id": "freizeichnung", "label": "Freizeichnung (Vier-Augen)", "typ": "freigabe", "minRolle": "referatsleiter", "naechsteSchritte": ["zustellung", "bescheid_entwurf"], "aktionen": [{"id": "freigeben", "label": "Freizeichnen", "ziel": "zustellung"}, {"id": "zurueckweisen", "label": "Zur Überarbeitung", "ziel": "bescheid_entwurf"}]},
      {"id": "zustellung", "label": "Bescheid zustellen", "typ": "manuell", "naechsteSchritte": ["abgeschlossen"], "aktionen": [{"id": "zugestellt", "label": "Bescheid zugestellt", "ziel": "abgeschlossen"}], "hinweis": "Zustellung an Bauherr und beteiligte Angrenzer (§ 58 Abs. 1 LBO BW)."},
      {"id": "abgeschlossen", "label": "Vorgang abgeschlossen", "typ": "endstatus", "naechsteSchritte": [], "aktionen": []}
    ]
  }'::jsonb);

-- ==============================
-- 4. Workflow: Baugenehmigung regulaer (BW)
-- ==============================
-- Voller Pruefumfang (§ 58 Abs. 1 LBO BW).
-- Entscheidungsfrist 2 Monate (§ 54 Abs. 5 LBO BW).
-- Keine Genehmigungsfiktion.

INSERT INTO config_workflows (verfahrensart_id, bundesland, version, definition) VALUES
  ('b1000000-0000-4000-8000-000000000003', 'BW', 1, '{
    "name": "Baugenehmigung regulär (BW)",
    "version": 1,
    "initialStatus": "eingegangen",
    "schritte": [
      {"id": "eingegangen", "label": "Antrag eingegangen", "typ": "automatisch", "naechsteSchritte": ["vollstaendigkeitspruefung"], "aktionen": []},
      {"id": "vollstaendigkeitspruefung", "label": "Vollständigkeitsprüfung", "typ": "manuell", "naechsteSchritte": ["nachforderung", "beteiligung"], "aktionen": [{"id": "vollstaendig", "label": "Vollständig", "ziel": "beteiligung"}, {"id": "unvollstaendig", "label": "Unvollständig — Nachforderung", "ziel": "nachforderung"}], "frist": "vollstaendigkeitspruefung", "hinweis": "Vollständigkeit innerhalb von 10 Arbeitstagen prüfen (§ 54 Abs. 1 LBO BW).", "checkliste": ["Lageplan", "Bauzeichnungen", "Baubeschreibung", "Standsicherheitsnachweis", "Brandschutznachweis"]},
      {"id": "nachforderung", "label": "Nachforderung", "typ": "manuell", "naechsteSchritte": ["vollstaendigkeitspruefung"], "aktionen": [{"id": "eingegangen", "label": "Unterlagen eingegangen", "ziel": "vollstaendigkeitspruefung"}], "hinweis": "Fristabläufe sind gehemmt bis Nachbesserung eingeht (§ 54 Abs. 1 Satz 3 LBO BW)."},
      {"id": "beteiligung", "label": "ToEB-Beteiligung", "typ": "manuell", "naechsteSchritte": ["pruefung"], "aktionen": [{"id": "abgeschlossen", "label": "Alle Stellungnahmen eingegangen", "ziel": "pruefung"}], "frist": "beteiligungsfrist", "hinweis": "Stellungnahmefrist max. 1 Monat (§ 54 Abs. 3 LBO BW)."},
      {"id": "pruefung", "label": "Fachliche Prüfung", "typ": "manuell", "naechsteSchritte": ["bescheid_entwurf"], "aktionen": [{"id": "genehmigen", "label": "Genehmigung empfehlen", "ziel": "bescheid_entwurf"}], "frist": "gesamtfrist", "hinweis": "Entscheidungsfrist 2 Monate (§ 54 Abs. 5 LBO BW). Keine Genehmigungsfiktion im regulären Verfahren."},
      {"id": "bescheid_entwurf", "label": "Bescheid erstellen", "typ": "manuell", "naechsteSchritte": ["freizeichnung"], "aktionen": [{"id": "fertig", "label": "Bescheid erstellt — Freigabe", "ziel": "freizeichnung"}]},
      {"id": "freizeichnung", "label": "Freizeichnung (Vier-Augen)", "typ": "freigabe", "minRolle": "referatsleiter", "naechsteSchritte": ["zustellung", "bescheid_entwurf"], "aktionen": [{"id": "freigeben", "label": "Freizeichnen", "ziel": "zustellung"}, {"id": "zurueckweisen", "label": "Zur Überarbeitung", "ziel": "bescheid_entwurf"}]},
      {"id": "zustellung", "label": "Bescheid zustellen", "typ": "manuell", "naechsteSchritte": ["abgeschlossen"], "aktionen": [{"id": "zugestellt", "label": "Bescheid zugestellt", "ziel": "abgeschlossen"}], "hinweis": "Zustellung an Bauherr, Angrenzer mit Einwendungen und berührte Nachbarn (§ 58 Abs. 1 LBO BW)."},
      {"id": "abgeschlossen", "label": "Vorgang abgeschlossen", "typ": "endstatus", "naechsteSchritte": [], "aktionen": []}
    ]
  }'::jsonb);

-- ==============================
-- 5. Workflow: Bauvorbescheid (BW)
-- ==============================
-- Vorab-Klaerung einzelner Fragen (§ 57 LBO BW).
-- Vereinfachter Workflow ohne Beteiligung (nur auf Antrag).
-- Entscheidungsfrist 1 Monat (§ 54 Abs. 5 LBO BW).

INSERT INTO config_workflows (verfahrensart_id, bundesland, version, definition) VALUES
  ('b1000000-0000-4000-8000-000000000004', 'BW', 1, '{
    "name": "Bauvorbescheid (BW)",
    "version": 1,
    "initialStatus": "eingegangen",
    "schritte": [
      {"id": "eingegangen", "label": "Antrag eingegangen", "typ": "automatisch", "naechsteSchritte": ["vollstaendigkeitspruefung"], "aktionen": []},
      {"id": "vollstaendigkeitspruefung", "label": "Vollständigkeitsprüfung", "typ": "manuell", "naechsteSchritte": ["nachforderung", "pruefung"], "aktionen": [{"id": "vollstaendig", "label": "Vollständig", "ziel": "pruefung"}, {"id": "unvollstaendig", "label": "Unvollständig — Nachforderung", "ziel": "nachforderung"}], "frist": "vollstaendigkeitspruefung", "hinweis": "Vollständigkeit innerhalb von 10 Arbeitstagen prüfen (§ 54 Abs. 1 LBO BW)."},
      {"id": "nachforderung", "label": "Nachforderung", "typ": "manuell", "naechsteSchritte": ["vollstaendigkeitspruefung"], "aktionen": [{"id": "eingegangen", "label": "Unterlagen eingegangen", "ziel": "vollstaendigkeitspruefung"}]},
      {"id": "pruefung", "label": "Fachliche Prüfung", "typ": "manuell", "naechsteSchritte": ["bescheid_entwurf"], "aktionen": [{"id": "entschieden", "label": "Vorbescheid erstellen", "ziel": "bescheid_entwurf"}], "frist": "gesamtfrist", "hinweis": "Entscheidungsfrist 1 Monat (§ 54 Abs. 5 i.V.m. § 57 Abs. 2 LBO BW)."},
      {"id": "bescheid_entwurf", "label": "Vorbescheid erstellen", "typ": "manuell", "naechsteSchritte": ["freizeichnung"], "aktionen": [{"id": "fertig", "label": "Vorbescheid erstellt — Freigabe", "ziel": "freizeichnung"}]},
      {"id": "freizeichnung", "label": "Freizeichnung (Vier-Augen)", "typ": "freigabe", "minRolle": "referatsleiter", "naechsteSchritte": ["zustellung", "bescheid_entwurf"], "aktionen": [{"id": "freigeben", "label": "Freizeichnen", "ziel": "zustellung"}, {"id": "zurueckweisen", "label": "Zur Überarbeitung", "ziel": "bescheid_entwurf"}]},
      {"id": "zustellung", "label": "Vorbescheid zustellen", "typ": "manuell", "naechsteSchritte": ["abgeschlossen"], "aktionen": [{"id": "zugestellt", "label": "Vorbescheid zugestellt", "ziel": "abgeschlossen"}]},
      {"id": "abgeschlossen", "label": "Vorgang abgeschlossen", "typ": "endstatus", "naechsteSchritte": [], "aktionen": []}
    ]
  }'::jsonb);

-- ==============================
-- 6. Fristen: Kenntnisgabeverfahren (BW)
-- ==============================

INSERT INTO config_fristen (bundesland, verfahrensart_id, typ, bezeichnung, werktage, rechtsgrundlage) VALUES
  ('BW', 'b1000000-0000-4000-8000-000000000001', 'eingangsbestaetigung',    'Eingangsbestätigung Kenntnisgabe',   5,  '§ 53 Abs. 5 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000001', 'baubeginn_wartefrist',    'Baubeginn-Wartefrist',              10,  '§ 59 Abs. 4 LBO BW');

-- ==============================
-- 7. Fristen: Baugenehmigung vereinfacht (BW)
-- ==============================

INSERT INTO config_fristen (bundesland, verfahrensart_id, typ, bezeichnung, werktage, rechtsgrundlage) VALUES
  ('BW', 'b1000000-0000-4000-8000-000000000002', 'vollstaendigkeitspruefung', 'Vollständigkeitsprüfung',          10,  '§ 54 Abs. 1 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000002', 'beteiligungsfrist',         'Beteiligungsfrist ToEB',           20,  '§ 54 Abs. 3 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000002', 'gesamtfrist',              'Entscheidungsfrist (vereinfacht)',   20,  '§ 54 Abs. 5 LBO BW');

-- ==============================
-- 8. Fristen: Baugenehmigung regulaer (BW)
-- ==============================

INSERT INTO config_fristen (bundesland, verfahrensart_id, typ, bezeichnung, werktage, rechtsgrundlage) VALUES
  ('BW', 'b1000000-0000-4000-8000-000000000003', 'vollstaendigkeitspruefung', 'Vollständigkeitsprüfung',          10,  '§ 54 Abs. 1 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000003', 'beteiligungsfrist',         'Beteiligungsfrist ToEB',           20,  '§ 54 Abs. 3 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000003', 'gesamtfrist',              'Entscheidungsfrist (regulär)',       40,  '§ 54 Abs. 5 LBO BW');

-- ==============================
-- 9. Fristen: Bauvorbescheid (BW)
-- ==============================

INSERT INTO config_fristen (bundesland, verfahrensart_id, typ, bezeichnung, werktage, rechtsgrundlage) VALUES
  ('BW', 'b1000000-0000-4000-8000-000000000004', 'vollstaendigkeitspruefung', 'Vollständigkeitsprüfung',          10,  '§ 54 Abs. 1 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000004', 'gesamtfrist',              'Entscheidungsfrist Vorbescheid',    20,  '§ 54 Abs. 5 i.V.m. § 57 Abs. 2 LBO BW');

-- ==============================
-- 10. Feiertage BW 2026
-- ==============================
-- Nur BW-spezifische Feiertage (bundesweite liegen bereits mit bundesland=NULL vor)

INSERT INTO config_feiertage (bundesland, datum, bezeichnung, jahr) VALUES
  ('BW', '2026-01-06', 'Heilige Drei Könige',   2026),
  ('BW', '2026-06-04', 'Fronleichnam',           2026),
  ('BW', '2026-11-01', 'Allerheiligen',          2026);

-- ==============================
-- 11. Feiertage BW 2027
-- ==============================

INSERT INTO config_feiertage (bundesland, datum, bezeichnung, jahr) VALUES
  ('BW', '2027-01-06', 'Heilige Drei Könige',   2027),
  ('BW', '2027-05-27', 'Fronleichnam',           2027),
  ('BW', '2027-11-01', 'Allerheiligen',          2027);
-- ============================================================================
-- PROJ-7: XBau-Basisschnittstelle — Nachrichten-Schema
-- Migration: 20260328200000_proj7_xbau_nachrichten.sql
-- ADR-015 (XBau-Nachrichten-Datenmodell), ADR-004 (XBau-Integrationsstrategie)
-- ADR-007 (Multi-Tenancy, Service-Only-Pattern)
--
-- Tabellen:
--   1. xbau_nachrichten (Service-Only, mandantenfaehig) — Ein-/Ausgehende XBau-Nachrichten
--   2. config_xbau_codelisten (Service-Only) — Mapping XBau-Codes <-> DB-Codes
--
-- Aenderungen an bestehenden Tabellen:
--   3. config_verfahrensarten: ADD COLUMN xbau_code (ADR-015 Entscheidung 5)
--
-- Voraussetzung: 20260326100000_proj2_mandanten_schema_rls.sql
--   (tenants, tenant_members, audit_log, get_tenant_id(), update_updated_at())
-- Voraussetzung: 20260326120000_proj3_vorgangsverwaltung.sql
--   (vorgaenge, config_verfahrensarten)
-- ============================================================================


-- ============================================================================
-- 1. Tabelle: xbau_nachrichten (Service-Only, mandantenfaehig)
-- ADR-015: Zentrale Nachrichtentabelle fuer alle ein-/ausgehenden XBau-Nachrichten
-- Zugriff nur ueber Service-Role im Backend (deny-all RLS)
-- ============================================================================

CREATE TABLE xbau_nachrichten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),

  -- XBau-Nachrichten-Identifikation
  nachrichten_uuid uuid NOT NULL,          -- nachrichtenkopf.nachrichtenUUID aus XML
  nachrichtentyp text NOT NULL,            -- z.B. '0200', '0201', '1100', '1180', '0420'
  richtung text NOT NULL                   -- 'eingang' oder 'ausgang'
    CHECK (richtung IN ('eingang', 'ausgang')),

  -- Verarbeitungsstatus (ADR-015 Status-Lifecycle)
  -- Eingang: empfangen → verarbeitet | abgewiesen
  -- Ausgang: generiert → heruntergeladen
  status text NOT NULL DEFAULT 'empfangen'
    CHECK (status IN ('empfangen', 'verarbeitet', 'abgewiesen', 'generiert', 'heruntergeladen')),

  -- Vorgangszuordnung (nullable: Nachricht kann noch nicht zugeordnet sein)
  vorgang_id uuid REFERENCES vorgaenge(id),

  -- Korrelationsfelder (ADR-015 Zuordnungsalgorithmus, dreistufig)
  referenz_uuid uuid,                     -- bezug.referenz (Portal-UUID)
  bezug_nachrichten_uuid uuid,            -- bezug.bezugNachricht.nachrichtenUUID
  bezug_aktenzeichen text,                -- bezug.vorgang (Aktenzeichen der Gegenbehoerde)

  -- Absender/Empfaenger aus Nachrichtenkopf
  absender_behoerde text,                 -- nachrichtenkopf.autor.verzeichnisdienst
  empfaenger_behoerde text,               -- nachrichtenkopf.leser.verzeichnisdienst

  -- Dualstruktur (ADR-015): roh_xml + kerndaten
  roh_xml text NOT NULL,                  -- Vollstaendiges Roh-XML (PII-sensitiv, NIE an Frontend)
  kerndaten jsonb NOT NULL DEFAULT '{}',  -- Extrahierte Daten fuer UI (kein PII)

  -- Fehlerdetails bei Abweisung (Fehlerkennzahl X/V/S/A-Serie, Fehlertext)
  fehler_details jsonb,                   -- z.B. {"kennzahl": "X001", "text": "..."}

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Duplikat-Schutz: Dieselbe Nachricht darf pro Tenant nur einmal existieren (US-1a AC-8)
  UNIQUE(tenant_id, nachrichten_uuid)
);

COMMENT ON TABLE xbau_nachrichten IS 'Service-Only: Ein-/ausgehende XBau-Nachrichten (ADR-015). Zugriff nur ueber Service-Role. Roh-XML ist PII-sensitiv.';
COMMENT ON COLUMN xbau_nachrichten.nachrichten_uuid IS 'XBau nachrichtenkopf.nachrichtenUUID — eindeutig pro Nachricht.';
COMMENT ON COLUMN xbau_nachrichten.nachrichtentyp IS 'XBau-Nachrichtentyp: 0200 (Antrag), 0201 (Formelle Pruefung), 0420-0427 (Statistik), 1100 (Rueckweisung), 1180 (Quittung).';
COMMENT ON COLUMN xbau_nachrichten.richtung IS 'eingang = empfangene Nachricht, ausgang = generierte Nachricht.';
COMMENT ON COLUMN xbau_nachrichten.status IS 'Lifecycle: empfangen→verarbeitet|abgewiesen (Eingang), generiert→heruntergeladen (Ausgang).';
COMMENT ON COLUMN xbau_nachrichten.roh_xml IS 'PII-sensitiv: Vollstaendiges XML. Nur Backend-Zugriff, nie an Frontend ausliefern (NFR-8).';
COMMENT ON COLUMN xbau_nachrichten.kerndaten IS 'Extrahierte Kerndaten fuer UI-Anzeige (Transportprotokoll). Kein PII.';
COMMENT ON COLUMN xbau_nachrichten.referenz_uuid IS 'bezug.referenz — Portal-UUID fuer Folgenachrichten-Zuordnung (Stufe 2).';
COMMENT ON COLUMN xbau_nachrichten.bezug_nachrichten_uuid IS 'bezug.bezugNachricht.nachrichtenUUID — Zuordnung Stufe 3.';
COMMENT ON COLUMN xbau_nachrichten.bezug_aktenzeichen IS 'bezug.vorgang — Aktenzeichen fuer Zuordnung Stufe 1.';

-- RLS: Service-Only (deny-all fuer Client-Rollen, ADR-007)
ALTER TABLE xbau_nachrichten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xbau_nachrichten_deny_select" ON xbau_nachrichten
  FOR SELECT USING (false);
CREATE POLICY "xbau_nachrichten_deny_insert" ON xbau_nachrichten
  FOR INSERT WITH CHECK (false);
CREATE POLICY "xbau_nachrichten_deny_update" ON xbau_nachrichten
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "xbau_nachrichten_deny_delete" ON xbau_nachrichten
  FOR DELETE USING (false);

-- Indizes (ADR-015 Zuordnungsalgorithmus + Transportprotokoll)

-- Transportprotokoll: Nachrichten eines Vorgangs chronologisch laden
CREATE INDEX idx_xbau_nachrichten_vorgang ON xbau_nachrichten(tenant_id, vorgang_id, created_at DESC)
  WHERE vorgang_id IS NOT NULL;

-- Duplikat-Lookup (UNIQUE-Constraint deckt dies ab, aber expliziter Index fuer Lesbarkeit)
-- UNIQUE(tenant_id, nachrichten_uuid) erzeugt bereits einen Index — kein zusaetzlicher noetig

-- Zuordnungsalgorithmus Stufe 2: bezug.referenz → referenz_uuid
CREATE INDEX idx_xbau_nachrichten_referenz ON xbau_nachrichten(tenant_id, referenz_uuid)
  WHERE referenz_uuid IS NOT NULL;

-- Fehler-Queue / Status-Filterung
CREATE INDEX idx_xbau_nachrichten_status ON xbau_nachrichten(tenant_id, status);

-- updated_at-Trigger
CREATE TRIGGER trg_xbau_nachrichten_updated_at
  BEFORE UPDATE ON xbau_nachrichten
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- 2. Tabelle: config_xbau_codelisten (Service-Only)
-- ADR-004: Codelisten-Mapping DB-Codes <-> XBau-Codes
-- Referenz: xbau-codes.xsd (listURI, listVersionID als fixed-Attribute)
-- ============================================================================

CREATE TABLE config_xbau_codelisten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codeliste text NOT NULL,                -- z.B. 'Code.RaeumeAnzahl', 'Code.Energietraeger'
  xbau_code text NOT NULL,                -- Code-Wert im XBau-XML
  db_code text,                           -- Zugehoeriger Code in der DB (nullable: nicht jeder XBau-Code hat DB-Pendant)
  bezeichnung text NOT NULL,              -- Menschenlesbare Bezeichnung
  list_uri text NOT NULL,                 -- listURI aus xbau-codes.xsd (fixed-Attribut)
  list_version_id text NOT NULL,          -- listVersionID aus xbau-codes.xsd (fixed-Attribut)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(codeliste, xbau_code)
);

COMMENT ON TABLE config_xbau_codelisten IS 'Service-Only: Mapping XBau-Codes <-> DB-Codes (ADR-004). listURI und listVersionID exakt aus xbau-codes.xsd.';
COMMENT ON COLUMN config_xbau_codelisten.codeliste IS 'XBau-Codelistenname (z.B. Code.RaeumeAnzahl). Entspricht Typ in xbau-codes.xsd.';
COMMENT ON COLUMN config_xbau_codelisten.xbau_code IS 'Code-Wert wie im XBau-XML verwendet.';
COMMENT ON COLUMN config_xbau_codelisten.db_code IS 'Zugehoeriger DB-Code (z.B. code_energietraeger.code). NULL wenn kein DB-Pendant.';
COMMENT ON COLUMN config_xbau_codelisten.list_uri IS 'Exakt aus xbau-codes.xsd: listURI fixed-Attribut. Pflicht in jedem generierten XML.';
COMMENT ON COLUMN config_xbau_codelisten.list_version_id IS 'Exakt aus xbau-codes.xsd: listVersionID fixed-Attribut. Pflicht in jedem generierten XML.';

-- RLS: Service-Only (deny-all fuer Client-Rollen)
ALTER TABLE config_xbau_codelisten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_xbau_codelisten_deny_select" ON config_xbau_codelisten
  FOR SELECT USING (false);
CREATE POLICY "config_xbau_codelisten_deny_insert" ON config_xbau_codelisten
  FOR INSERT WITH CHECK (false);
CREATE POLICY "config_xbau_codelisten_deny_update" ON config_xbau_codelisten
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "config_xbau_codelisten_deny_delete" ON config_xbau_codelisten
  FOR DELETE USING (false);

-- Index: UNIQUE(codeliste, xbau_code) erzeugt bereits den primaeren Lookup-Index
-- Zusaetzlicher Index fuer Reverse-Lookup (DB-Code → XBau-Code bei Export)
CREATE INDEX idx_config_xbau_codelisten_db_code ON config_xbau_codelisten(codeliste, db_code)
  WHERE db_code IS NOT NULL;

-- updated_at-Trigger
CREATE TRIGGER trg_config_xbau_codelisten_updated_at
  BEFORE UPDATE ON config_xbau_codelisten
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- 3. ALTER TABLE: config_verfahrensarten — xbau_code Spalte
-- ADR-015 Entscheidung 5: Verfahrensart-Mapping ueber Spalte statt Mapping-Tabelle
-- Lookup: WHERE xbau_code = ? AND bundesland = ?
-- ============================================================================

ALTER TABLE config_verfahrensarten
  ADD COLUMN xbau_code text;

COMMENT ON COLUMN config_verfahrensarten.xbau_code IS 'XBau-Verfahrensart-Code fuer Import-Mapping (ADR-015). NULL wenn Verfahrensart kein XBau-Pendant hat.';

-- Index: Lookup bei XBau-Import (0200 → Verfahrensart ermitteln)
CREATE INDEX idx_config_verfahrensarten_xbau ON config_verfahrensarten(xbau_code, bundesland)
  WHERE xbau_code IS NOT NULL;


-- ============================================================================
-- Rollback-Hinweis
-- ============================================================================
-- Rollback-Script: supabase/rollbacks/20260328200000_proj7_xbau_nachrichten_rollback.sql
--
-- DROP INDEX IF EXISTS idx_config_verfahrensarten_xbau;
-- ALTER TABLE config_verfahrensarten DROP COLUMN IF EXISTS xbau_code;
-- DROP TRIGGER IF EXISTS trg_config_xbau_codelisten_updated_at ON config_xbau_codelisten;
-- DROP TABLE IF EXISTS config_xbau_codelisten;
-- DROP TRIGGER IF EXISTS trg_xbau_nachrichten_updated_at ON xbau_nachrichten;
-- DROP TABLE IF EXISTS xbau_nachrichten;
-- ============================================================================
-- PROJ-7: Background Jobs fuer asynchrone XBau-Verarbeitung
-- Migration: 20260328210000_background_jobs.sql
-- ADR-008 (Asynchrone Verarbeitung), ADR-015 (XBau-Nachrichten-Datenmodell)
-- ADR-007 (Multi-Tenancy, Service-Only-Pattern)
--
-- Tabelle:
--   background_jobs (Service-Only, mandantenfaehig)
--   Zentrale Job-Queue fuer alle asynchronen Operationen (XBau-Generierung,
--   Validierung, Parsing, OCR, PDF-Generierung, Export).
--
-- Voraussetzung: 20260326100000_proj2_mandanten_schema_rls.sql
--   (tenants, update_updated_at())
-- ============================================================================


-- ============================================================================
-- 1. Tabelle: background_jobs (Service-Only, mandantenfaehig)
-- ADR-008: Zentrale Job-Tabelle als Abstraktionsschicht zwischen API-Routes
--          und Workern (lokal, Edge Function, externer Service).
-- ADR-015: XBau-Service kommuniziert ueber diese Tabelle mit dem Fachverfahren.
-- ============================================================================

CREATE TABLE background_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),

  -- Job-Typ: bestimmt welcher Worker den Job verarbeitet
  type text NOT NULL,                           -- z.B. 'xbau_generate', 'xbau_validate', 'xbau_parse',
                                                --      'ocr', 'pdf_generation', 'export', 'frist_erinnerung'

  -- Status-Lifecycle (ADR-008):
  -- pending → processing → completed | failed → (retry) → pending | dead_letter
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter')),

  -- Eingabedaten: Job-spezifisch (ADR-015 Schnittstellenvertrag)
  -- XBau-Beispiel: {"nachrichtentyp": "0201", "vorgang_id": "...", "payload": {...}}
  input jsonb NOT NULL DEFAULT '{}',

  -- Ergebnisdaten: Erst nach Abschluss gefuellt
  -- XBau-Beispiel: {"nachricht_id": "...", "status": "completed"} oder {"fehler": "..."}
  output jsonb,

  -- Retry-Steuerung (ADR-015: 3 Versuche, 30s/60s/120s Delay)
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  next_retry_at timestamptz,                    -- Naechster Retry-Zeitpunkt (NULL wenn nicht retry-faehig)

  -- Zeitmessung
  started_at timestamptz,                       -- Wann der Worker die Verarbeitung begonnen hat
  completed_at timestamptz,                     -- Wann abgeschlossen (success oder final failure)

  -- Webhook-Callback (ADR-015: XBau-Service ruft Fachverfahren nach Abschluss)
  webhook_url text,                             -- Callback-URL (z.B. /api/internal/xbau/webhook)
  webhook_delivered boolean NOT NULL DEFAULT false,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE background_jobs IS 'Service-Only: Zentrale Job-Queue fuer asynchrone Verarbeitung (ADR-008). Zugriff nur ueber Service-Role-Key.';
COMMENT ON COLUMN background_jobs.tenant_id IS 'Mandanten-Zuordnung. Jeder Job gehoert genau einem Tenant.';
COMMENT ON COLUMN background_jobs.type IS 'Job-Typ: xbau_generate, xbau_validate, xbau_parse, ocr, pdf_generation, export, frist_erinnerung.';
COMMENT ON COLUMN background_jobs.status IS 'Lifecycle: pending→processing→completed|failed. Nach max_attempts: dead_letter.';
COMMENT ON COLUMN background_jobs.input IS 'Job-spezifische Eingabedaten als JSON. XBau: {nachrichtentyp, vorgang_id, payload}.';
COMMENT ON COLUMN background_jobs.output IS 'Ergebnisdaten nach Abschluss. XBau: {nachricht_id} oder {fehler}.';
COMMENT ON COLUMN background_jobs.attempts IS 'Anzahl bisheriger Verarbeitungsversuche.';
COMMENT ON COLUMN background_jobs.max_attempts IS 'Maximale Versuche bevor dead_letter (ADR-015: Default 3).';
COMMENT ON COLUMN background_jobs.next_retry_at IS 'Naechster Retry-Zeitpunkt. NULL wenn kein Retry ansteht. Delay: 30s/60s/120s (ADR-015).';
COMMENT ON COLUMN background_jobs.started_at IS 'Zeitpunkt des Verarbeitungsbeginns durch den Worker.';
COMMENT ON COLUMN background_jobs.completed_at IS 'Zeitpunkt des Abschlusses (Erfolg oder finaler Fehlschlag).';
COMMENT ON COLUMN background_jobs.webhook_url IS 'Callback-URL nach Job-Abschluss (ADR-015 Webhook-Ablauf).';
COMMENT ON COLUMN background_jobs.webhook_delivered IS 'TRUE wenn Webhook erfolgreich zugestellt wurde.';


-- ============================================================================
-- 2. RLS: Service-Only (deny-all fuer Client-Rollen, ADR-007)
-- Zugriff erfolgt ausschliesslich ueber Service-Role-Key im Backend.
-- ============================================================================

ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "background_jobs_deny_select" ON background_jobs
  FOR SELECT USING (false);
CREATE POLICY "background_jobs_deny_insert" ON background_jobs
  FOR INSERT WITH CHECK (false);
CREATE POLICY "background_jobs_deny_update" ON background_jobs
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "background_jobs_deny_delete" ON background_jobs
  FOR DELETE USING (false);


-- ============================================================================
-- 3. Indizes
-- Worker-Abfrage: Naechsten ausstehenden Job finden (tenant + status + retry)
-- Status-Abfrage: Jobs eines bestimmten Typs und Status filtern
-- ============================================================================

-- Worker-Poll: SELECT ... WHERE status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= now())
-- Auch fuer Stuck-Detection: WHERE status = 'processing' AND started_at < now() - interval '10 minutes'
CREATE INDEX idx_background_jobs_worker_poll
  ON background_jobs(tenant_id, status, next_retry_at);

-- Status-Dashboard / Job-Typ-Filterung
CREATE INDEX idx_background_jobs_type_status
  ON background_jobs(tenant_id, type, status);


-- ============================================================================
-- 4. Trigger: updated_at automatisch aktualisieren
-- Nutzt bestehende Funktion aus 20260326100000_proj2_mandanten_schema_rls.sql
-- ============================================================================

CREATE TRIGGER trg_background_jobs_updated_at
  BEFORE UPDATE ON background_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- Rollback-Hinweis
-- ============================================================================
-- Rollback-Script: supabase/rollbacks/20260328210000_background_jobs_rollback.sql
--
-- DROP TRIGGER IF EXISTS trg_background_jobs_updated_at ON background_jobs;
-- DROP INDEX IF EXISTS idx_background_jobs_type_status;
-- DROP INDEX IF EXISTS idx_background_jobs_worker_poll;
-- DROP TABLE IF EXISTS background_jobs;
-- ============================================================================
-- PROJ-7: XBau-Versionierung pro Mandant
-- Migration: 20260328220000_tenants_xbau_version.sql
-- ADR-015 (XBau-Nachrichten-Datenmodell): Spalte xbau_version auf tenants
--
-- Rueckwaertskompatibel: NOT NULL mit DEFAULT '2.6' — bestehende Zeilen
-- erhalten automatisch den Default-Wert. Kein Locking-Problem bei kleiner
-- tenants-Tabelle (< 1000 Zeilen).
--
-- Voraussetzung: 20260326100000_proj2_mandanten_schema_rls.sql (tenants)
-- ============================================================================


-- ============================================================================
-- 1. ALTER TABLE: tenants — xbau_version Spalte
-- ADR-015: Routing nach XBau-Version erst bei Parallelbetrieb aktiv.
-- MVP-Default '2.6' — aendert sich erst bei XBau-Standardaktualisierung.
-- ============================================================================

ALTER TABLE tenants
  ADD COLUMN xbau_version text NOT NULL DEFAULT '2.6';

COMMENT ON COLUMN tenants.xbau_version IS 'XBau-Standard-Version fuer diesen Mandanten (ADR-015). Default 2.6. Routing bei Parallelbetrieb mehrerer Versionen.';


-- ============================================================================
-- Rollback-Hinweis
-- ============================================================================
-- Rollback-Script: supabase/rollbacks/20260328220000_tenants_xbau_version_rollback.sql
--
-- ALTER TABLE tenants DROP COLUMN IF EXISTS xbau_version;
