-- ============================================================================
-- PROJ-6: Bescheiderzeugung mit Textbausteinen
-- Migration: 20260329100100_proj6_bescheiderzeugung.sql
-- ADR-010 (PDF-Generierung), ADR-011 (Workflow Engine), ADR-006 (Rechtskonfiguration)
-- ADR-007 (Multi-Tenancy), ADR-003 (Service-Architektur)
--
-- Tabellen:
--   1. text_bausteine (mandantenfaehig) — Textbaustein-Bibliothek je Tenant
--   2. vorgang_bescheide (mandantenfaehig) — Bescheid-Entwuerfe und erzeugte Bescheide
--
-- Voraussetzungen:
--   20260326100000_proj2_mandanten_schema_rls.sql (tenants, get_tenant_id(), update_updated_at())
--   20260326120000_proj3_vorgangsverwaltung.sql (vorgaenge)
-- ============================================================================


-- ============================================================================
-- 1. ENUMs
-- ============================================================================

CREATE TYPE bescheidtyp AS ENUM (
  'genehmigung',
  'ablehnung',
  'vorbescheid',
  'teilgenehmigung'
);

COMMENT ON TYPE bescheidtyp IS 'PROJ-6: Bescheidtypen gemaess Bauordnungsrecht.';

CREATE TYPE bescheid_status AS ENUM (
  'entwurf',
  'pdf_erzeugt',
  'freigegeben',
  'zugestellt'
);

COMMENT ON TYPE bescheid_status IS 'PROJ-6: Lebenszyklus eines Bescheids (ADR-011 Workflow-Schritte bescheid_entwurf → freizeichnung → zustellung).';


-- ============================================================================
-- 2. Tabelle: text_bausteine (mandantenfaehig)
-- ADR-006: Textbausteine als konfigurierbare Datensaetze je Tenant
-- FA-1, FA-2: Durchsuchbare Bibliothek, behoerdenseitig pflegbar
-- ============================================================================

CREATE TABLE text_bausteine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),

  -- Inhalt
  titel text NOT NULL,
  kategorie text NOT NULL CHECK (kategorie IN (
    'einleitung',
    'tenor',
    'nebenbestimmungen',
    'begruendung',
    'rechtsbehelfsbelehrung',
    'sonstiges'
  )),
  inhalt text NOT NULL,

  -- Zuordnungen (Mehrfachauswahl, PROJ-6 US-2 AC-2)
  verfahrensarten text[] NOT NULL DEFAULT '{}',
  bescheidtypen text[] NOT NULL DEFAULT '{}',

  -- Sortierung und Aktivstatus
  sortierung int NOT NULL DEFAULT 0,
  aktiv boolean NOT NULL DEFAULT true,

  -- Metadaten
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE text_bausteine IS 'Mandantenfaehig: Textbaustein-Bibliothek fuer Bescheide (PROJ-6, ADR-006). Pflege durch tenant_admin.';
COMMENT ON COLUMN text_bausteine.kategorie IS 'Bescheid-Abschnitt: einleitung, tenor, nebenbestimmungen, begruendung, rechtsbehelfsbelehrung, sonstiges.';
COMMENT ON COLUMN text_bausteine.verfahrensarten IS 'Kuerzel der zugeordneten Verfahrensarten (z.B. {BG,BG-V}). Leeres Array = alle.';
COMMENT ON COLUMN text_bausteine.bescheidtypen IS 'Zugeordnete Bescheidtypen (z.B. {genehmigung,teilgenehmigung}). Leeres Array = alle.';
COMMENT ON COLUMN text_bausteine.inhalt IS 'Bescheidtext mit Platzhaltern in {{feldname}}-Syntax (Handlebars-kompatibel).';
COMMENT ON COLUMN text_bausteine.sortierung IS 'Reihenfolge innerhalb einer Kategorie. Niedrigere Werte zuerst.';


-- ============================================================================
-- 2a. RLS: text_bausteine
-- SELECT: Alle Tenant-Mitglieder (Sachbearbeiter sehen Bausteine)
-- INSERT/UPDATE: Nur tenant_admin (Behoerden-Admin pflegt Bausteine, US-2 AC-1)
-- DELETE: deny-all (Soft-Delete ueber aktiv-Flag, US-2 AC-5)
-- ============================================================================

ALTER TABLE text_bausteine ENABLE ROW LEVEL SECURITY;

-- SELECT: Alle Tenant-Mitglieder sehen aktive und inaktive Bausteine ihres Tenants
-- (Admin muss auch inaktive sehen koennen fuer Pflege-UI)
CREATE POLICY "text_bausteine_tenant_select" ON text_bausteine
  FOR SELECT USING (tenant_id = get_tenant_id());

-- INSERT: Nur tenant_admin darf neue Bausteine anlegen
-- Pruefung der Rolle ueber tenant_members-Tabelle
CREATE POLICY "text_bausteine_admin_insert" ON text_bausteine
  FOR INSERT WITH CHECK (
    tenant_id = get_tenant_id()
    AND EXISTS (
      SELECT 1 FROM tenant_members
      WHERE tenant_members.tenant_id = text_bausteine.tenant_id
        AND tenant_members.user_id = auth.uid()
        AND tenant_members.role IN ('tenant_admin', 'platform_admin')
    )
  );

-- UPDATE: Nur tenant_admin darf Bausteine aendern (inkl. aktiv-Flag = Soft-Delete)
CREATE POLICY "text_bausteine_admin_update" ON text_bausteine
  FOR UPDATE
  USING (
    tenant_id = get_tenant_id()
    AND EXISTS (
      SELECT 1 FROM tenant_members
      WHERE tenant_members.tenant_id = text_bausteine.tenant_id
        AND tenant_members.user_id = auth.uid()
        AND tenant_members.role IN ('tenant_admin', 'platform_admin')
    )
  )
  WITH CHECK (
    tenant_id = get_tenant_id()
    AND EXISTS (
      SELECT 1 FROM tenant_members
      WHERE tenant_members.tenant_id = text_bausteine.tenant_id
        AND tenant_members.user_id = auth.uid()
        AND tenant_members.role IN ('tenant_admin', 'platform_admin')
    )
  );

-- DELETE: deny-all (Soft-Delete ueber aktiv-Flag, kein harter DELETE)
CREATE POLICY "text_bausteine_deny_delete" ON text_bausteine
  FOR DELETE USING (false);


-- ============================================================================
-- 2b. Indizes: text_bausteine
-- ============================================================================

-- Primaer-Lookup: Aktive Bausteine eines Tenants nach Kategorie (Bescheid-Editor)
CREATE INDEX idx_text_bausteine_tenant_kategorie ON text_bausteine(tenant_id, kategorie, sortierung)
  WHERE aktiv = true;

-- Volltext-GIN-Index fuer Suche ueber Titel + Inhalt (FA-1, US-2 AC-6)
CREATE INDEX idx_text_bausteine_search ON text_bausteine USING gin(
  to_tsvector('german', coalesce(titel, '') || ' ' || coalesce(inhalt, ''))
);

-- Tenant-ID fuer RLS-Performance
CREATE INDEX idx_text_bausteine_tenant ON text_bausteine(tenant_id);

-- updated_at-Trigger
CREATE TRIGGER trg_text_bausteine_updated_at
  BEFORE UPDATE ON text_bausteine
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- 3. Tabelle: vorgang_bescheide (mandantenfaehig)
-- PROJ-6 FA-3 bis FA-8: Bescheid-Entwuerfe und erzeugte PDFs
-- ============================================================================

CREATE TABLE vorgang_bescheide (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL REFERENCES vorgaenge(id) ON DELETE CASCADE,

  -- Bescheidtyp und Status
  bescheidtyp bescheidtyp NOT NULL,
  status bescheid_status NOT NULL DEFAULT 'entwurf',

  -- Zusammengestellte Bausteine (geordnete Liste mit Baustein-ID + Snapshot des Inhalts)
  -- Format: [{"baustein_id": "uuid", "kategorie": "tenor", "titel": "...", "inhalt": "..."}]
  bausteine jsonb NOT NULL DEFAULT '[]',

  -- Nebenbestimmungen (separate Liste, automatisch nummeriert im Template)
  -- Format: [{"baustein_id": "uuid", "text": "...", "sortierung": 1}]
  nebenbestimmungen jsonb NOT NULL DEFAULT '[]',

  -- Platzhalter-Werte (befuellte Platzhalter aus Vorgangsdaten + manuelle Ergaenzungen)
  -- Format: {"aktenzeichen": "2026/BG-0142", "antragsteller": "Max Mustermann", ...}
  platzhalter_werte jsonb NOT NULL DEFAULT '{}',

  -- PDF-Artefakt (nach Erzeugung, ADR-010)
  pdf_storage_path text,

  -- FK auf vorgang_dokumente wird spaeter hinzugefuegt (PROJ-5 Dokumentenverwaltung)
  -- Vorerst als nullable uuid ohne FK-Constraint
  pdf_dokument_id uuid,

  -- Akteure
  erstellt_von uuid REFERENCES auth.users(id),
  freigegeben_von uuid REFERENCES auth.users(id),
  freigegeben_am timestamptz,

  -- Metadaten
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Optimistic Locking (parallele Bearbeitung, Auto-Save)
  version int NOT NULL DEFAULT 1
);

COMMENT ON TABLE vorgang_bescheide IS 'Mandantenfaehig: Bescheid-Entwuerfe und erzeugte PDFs (PROJ-6). Gehoert zu einem Vorgang (FK CASCADE).';
COMMENT ON COLUMN vorgang_bescheide.bausteine IS 'Geordnete Liste zusammengestellter Textbausteine als JSONB-Snapshot. Baustein-Inhalt wird zum Zeitpunkt der Zusammenstellung kopiert.';
COMMENT ON COLUMN vorgang_bescheide.nebenbestimmungen IS 'Nebenbestimmungen als geordnete JSONB-Liste. Automatische Nummerierung im PDF-Template.';
COMMENT ON COLUMN vorgang_bescheide.platzhalter_werte IS 'Key-Value-Map befuellter Platzhalter. Keys entsprechen {{feldname}}-Syntax.';
COMMENT ON COLUMN vorgang_bescheide.pdf_storage_path IS 'Pfad zum erzeugten PDF in Supabase Storage (nach ADR-010 Background Job).';
COMMENT ON COLUMN vorgang_bescheide.pdf_dokument_id IS 'Referenz auf vorgang_dokumente (PROJ-5). FK-Constraint wird bei PROJ-5-Migration hinzugefuegt.';
COMMENT ON COLUMN vorgang_bescheide.freigegeben_von IS 'User-ID des Referatsleiters bei Freizeichnung (ADR-011 Schritt freizeichnung).';
COMMENT ON COLUMN vorgang_bescheide.version IS 'Optimistic Locking: Client sendet version bei UPDATE, Server prueft Gleichheit.';


-- ============================================================================
-- 3a. RLS: vorgang_bescheide (Standard-Mandanten-RLS)
-- ============================================================================

ALTER TABLE vorgang_bescheide ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vorgang_bescheide_tenant_select" ON vorgang_bescheide
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "vorgang_bescheide_tenant_insert" ON vorgang_bescheide
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "vorgang_bescheide_tenant_update" ON vorgang_bescheide
  FOR UPDATE USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "vorgang_bescheide_tenant_delete" ON vorgang_bescheide
  FOR DELETE USING (tenant_id = get_tenant_id());


-- ============================================================================
-- 3b. Indizes: vorgang_bescheide
-- ============================================================================

-- Bescheide eines Vorgangs nach Status (Bescheid-Editor, Workflow-Integration)
CREATE INDEX idx_vorgang_bescheide_vorgang_status ON vorgang_bescheide(vorgang_id, status);

-- Entwuerfe eines Tenants (Dashboard: offene Entwuerfe)
CREATE INDEX idx_vorgang_bescheide_tenant_entwurf ON vorgang_bescheide(tenant_id)
  WHERE status = 'entwurf';

-- Tenant-ID fuer RLS-Performance
CREATE INDEX idx_vorgang_bescheide_tenant ON vorgang_bescheide(tenant_id);

-- updated_at-Trigger
CREATE TRIGGER trg_vorgang_bescheide_updated_at
  BEFORE UPDATE ON vorgang_bescheide
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- 4. Seed-Daten: NRW-Textbausteine (Annahme PROJ-6)
-- Werden mit einem Platzhalter-tenant_id eingefuegt.
-- In der Praxis werden diese per Service-Role beim Tenant-Onboarding kopiert.
-- Fuer MVP/Entwicklung: direkt einfuegen mit dem ersten Tenant.
--
-- HINWEIS: Diese Seed-Daten werden nur eingefuegt wenn die Tabelle leer ist.
-- Bei Produktionsbetrieb werden Bausteine ueber Admin-UI gepflegt.
-- ============================================================================

-- Seed-Funktion: Fuegt NRW-Standard-Bausteine fuer den ersten vorhandenen Tenant ein
-- (Nur fuer Entwicklung — in Produktion per Onboarding-Script)
DO $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Ersten Tenant ermitteln (Entwicklungsumgebung)
  SELECT id INTO v_tenant_id FROM tenants LIMIT 1;

  -- Nur einfuegen wenn ein Tenant existiert und noch keine Bausteine vorhanden
  IF v_tenant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM text_bausteine LIMIT 1) THEN

    -- 1. Einleitung Genehmigung
    INSERT INTO text_bausteine (tenant_id, titel, kategorie, inhalt, verfahrensarten, bescheidtypen, sortierung)
    VALUES (
      v_tenant_id,
      'Einleitung Baugenehmigung',
      'einleitung',
      'Sehr geehrte(r) {{antragsteller}},

auf Ihren Antrag vom {{antragsdatum}} wird Ihnen hiermit die Baugenehmigung fuer das Bauvorhaben

{{bauvorhaben_bezeichnung}}

auf dem Grundstueck {{grundstueck_adresse}}, Gemarkung {{grundstueck_gemarkung}}, Flurstueck {{grundstueck_flurstueck}}

nach Massgabe der beigefuegten Bauvorlagen und unter den nachstehenden Nebenbestimmungen erteilt.',
      '{BG,BG-V}',
      '{genehmigung,teilgenehmigung}',
      10
    );

    -- 2. Tenor Genehmigung
    INSERT INTO text_bausteine (tenant_id, titel, kategorie, inhalt, verfahrensarten, bescheidtypen, sortierung)
    VALUES (
      v_tenant_id,
      'Tenor Baugenehmigung Standard',
      'tenor',
      'Die Baugenehmigung wird erteilt.

Die Baugenehmigung umfasst die in den mit Genehmigungsvermerk versehenen Bauvorlagen dargestellte bauliche Anlage.

Die Baugenehmigung gilt unbeschadet der privaten Rechte Dritter und der Genehmigungen und Erlaubnisse nach anderen Rechtsvorschriften.',
      '{BG,BG-V}',
      '{genehmigung}',
      10
    );

    -- 3. Rechtsbehelfsbelehrung NRW Standard
    INSERT INTO text_bausteine (tenant_id, titel, kategorie, inhalt, verfahrensarten, bescheidtypen, sortierung)
    VALUES (
      v_tenant_id,
      'Rechtsbehelfsbelehrung NRW',
      'rechtsbehelfsbelehrung',
      'Gegen diesen Bescheid kann innerhalb eines Monats nach Bekanntgabe Widerspruch erhoben werden. Der Widerspruch ist bei {{behoerde_name}}, {{behoerde_anschrift}}, schriftlich oder zur Niederschrift einzulegen.

Alternativ kann innerhalb eines Monats nach Bekanntgabe unmittelbar Klage beim Verwaltungsgericht {{verwaltungsgericht}}, {{verwaltungsgericht_anschrift}}, schriftlich oder zur Niederschrift des Urkundsbeamten der Geschaeftsstelle erhoben werden.',
      '{}',
      '{}',
      10
    );

    -- 4. Nebenbestimmung: Baubeginn anzeigen
    INSERT INTO text_bausteine (tenant_id, titel, kategorie, inhalt, verfahrensarten, bescheidtypen, sortierung)
    VALUES (
      v_tenant_id,
      'Baubeginn anzeigen',
      'nebenbestimmungen',
      'Der Baubeginn ist der Bauaufsichtsbehoerde mindestens eine Woche vorher schriftlich anzuzeigen (§ 74 Abs. 1 BauO NRW).',
      '{BG,BG-V}',
      '{genehmigung,teilgenehmigung}',
      10
    );

    -- 5. Nebenbestimmung: Bauleiter bestellen
    INSERT INTO text_bausteine (tenant_id, titel, kategorie, inhalt, verfahrensarten, bescheidtypen, sortierung)
    VALUES (
      v_tenant_id,
      'Bauleiter bestellen',
      'nebenbestimmungen',
      'Vor Baubeginn ist ein Bauleiter zu bestellen und der Bauaufsichtsbehoerde zu benennen (§ 56 BauO NRW).',
      '{BG,BG-V}',
      '{genehmigung,teilgenehmigung}',
      20
    );

  END IF;
END $$;
