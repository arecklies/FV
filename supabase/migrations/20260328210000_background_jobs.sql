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
