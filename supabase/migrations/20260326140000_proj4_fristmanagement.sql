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
