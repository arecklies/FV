-- BW Geltungsdauer (PROJ-48, abhaengig von PROJ-44 BW-Verfahrensarten)
INSERT INTO config_fristen (bundesland, verfahrensart_id, typ, bezeichnung, kalendertage, rechtsgrundlage) VALUES
  ('BW', 'b1000000-0000-4000-8000-000000000002', 'geltungsdauer', 'Geltungsdauer Baugenehmigung',  1095, '§ 62 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000003', 'geltungsdauer', 'Geltungsdauer Baugenehmigung',  1095, '§ 62 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000004', 'geltungsdauer', 'Geltungsdauer Bauvorbescheid',  1095, '§ 62 LBO BW')
ON CONFLICT (bundesland, verfahrensart_id, typ) DO NOTHING;
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
