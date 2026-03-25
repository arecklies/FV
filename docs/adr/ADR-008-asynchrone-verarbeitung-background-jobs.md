# ADR-008: Asynchrone Verarbeitung und Background Jobs

**Status:** Proposed
**Datum:** 2026-03-25
**Autor:** Senior Software Architect

## Kontext

Vier der sechs Phase-1-Features erfordern Verarbeitung, die nicht innerhalb des Vercel-Serverless-Timeouts (55 Sekunden) abgeschlossen werden kann:

| Feature | Operation | Geschaetzte Dauer | Problem |
|---|---|---|---|
| PROJ-4 (Fristmanagement) | Erinnerungs-E-Mails, Eskalationen (Cron) | Periodisch (taeglich) | Kein nativer Cron auf Vercel Hobby/Pro |
| PROJ-5 (Dokumentenverwaltung) | OCR-Indexierung nach Upload | 10-60 Sekunden pro Dokument | Kann 55s ueberschreiten bei grossen PDFs |
| PROJ-6 (Bescheiderzeugung) | PDF/A-Generierung mit Headless Chrome | 5-15 Sekunden | Puppeteer/Playwright laeuft nicht auf Vercel Serverless (kein Chromium) |
| PROJ-8 (Datenexport) | Vollstaendiger Mandanten-Export (ZIP) | Minuten bis Stunden | Weit ueber 55s, benoetigt persistentes Dateisystem |

Zusaetzlich referenziert ADR-003 (Service-Architektur) explizit, dass Services "aus API-Routes, Server Components und zukuenftigen Queue-Workern aufrufbar sein" muessen. Die Job-Infrastruktur ist also architektonisch vorgesehen, aber nicht entschieden.

### Constraints
- Vercel Serverless: Max 55 Sekunden Ausfuehrungszeit, kein persistentes Dateisystem, kein lokaler Zustand
- Vercel Cron Jobs: Verfuegbar ab Pro-Plan, aber nur HTTP-basiert (ruft eine API-Route auf) mit max. 60s Laufzeit
- Lean-Startup-Team: Keine dedizierte Infrastruktur fuer Message Broker (RabbitMQ, Redis Queue)
- Supabase: Bietet pg_cron (DB-seitige Cron-Jobs) und Edge Functions (Deno-basiert, 150s Timeout)

## Wichtiger Kontext: Lokale Entwicklung

Fuer die aktuelle Entwicklungs- und MVP-Phase ist **kein Vercel-Deployment erforderlich**. Das System wird lokal mit `next dev` / `next start` auf einem Node.js-Server betrieben. Damit entfallen die Vercel-spezifischen Einschraenkungen (55s-Timeout, kein Chromium, kein persistentes Dateisystem) fuer die Entwicklungsphase. Die Architektur muss dennoch so gestaltet sein, dass ein spaeterer Wechsel auf Vercel oder Self-Hosted moeglich bleibt.

## Entscheidung

**Dreistufiges Modell: Lokale Node.js-Worker (MVP) + pg_cron fuer periodische Jobs + Supabase Edge Functions oder eigener Worker-Service fuer Produktion.**

### Stufe 0: Lokale Node.js-Worker (MVP-Entwicklung)

In der lokalen Entwicklung (`next dev` / `next start`) laufen alle Operationen ohne Timeout-Limit:

- **PDF-Generierung**: Puppeteer direkt auf dem lokalen Node.js-Server (Chromium lokal installiert)
- **OCR-Indexierung**: Node.js-Prozess mit `pdf-parse` oder `tesseract.js` direkt im API-Handler
- **Datenexport**: Synchron oder als lokaler Child-Process, Ergebnis in `tmp/` ablegen
- **Cron-Jobs**: `node-cron` oder `setInterval` im laufenden Next.js-Server

**Pattern fuer lokale Langlaeufer:**
```typescript
// In der API-Route: Job starten, sofort antworten
const jobId = await backgroundJobs.create({ type: 'export', tenantId, input });
// Worker-Loop im Server-Prozess pickt den Job auf und verarbeitet ihn
return NextResponse.json({ jobId, status: 'pending' });
```

Die `background_jobs`-Tabelle (siehe unten) wird trotzdem genutzt -- sie ist die Abstraktionsschicht, die den Wechsel auf Edge Functions oder externe Worker spaeter ermoeglicht. Der lokale Worker liest einfach aus derselben Tabelle.

**Vorteile:**
- Kein externer Dienst, kein Zusatzkosten
- Puppeteer, OCR, grosse Dateien -- alles funktioniert lokal ohne Einschraenkung
- Gleiche Job-Tabelle wie in Produktion -- nahtloser Uebergang

**Einschraenkung:** Nur fuer Einzelentwickler/MVP. Bei mehreren Instanzen (Load Balancing) braucht es einen dedizierten Worker.

### Stufe 1: pg_cron fuer periodische Jobs (Phase 0/1)

PostgreSQL-basierte Cron-Jobs fuer zeitgesteuerte Operationen direkt in der Datenbank:

```sql
-- Beispiel: Frist-Erinnerungen taeglich um 06:00 UTC
SELECT cron.schedule(
  'frist-erinnerungen',
  '0 6 * * *',
  $$
    SELECT net.http_post(
      url := 'https://<app-url>/api/internal/fristen/erinnerungen',
      headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>'),
      body := '{}'::jsonb
    );
  $$
);
```

**Einsatzbereich:** Frist-Eskalationen (PROJ-4), Ablauf befristeter Export-Links (PROJ-8), Cleanup abgelaufener Sessions.

**Vorteile:**
- Kein zusaetzlicher Service noetig -- laeuft in der bestehenden Supabase-Instanz
- Zuverlaessig (PostgreSQL-Scheduler, kein externer Dienst)
- Einfache Konfiguration ueber SQL

**Einschraenkungen:**
- Ruft HTTP-Endpunkte auf -- die Verarbeitung selbst unterliegt weiterhin dem Vercel-Timeout
- Fuer kurze, periodische Aufgaben (Benachrichtigungen senden, Status pruefen) geeignet
- Nicht fuer langlebige Verarbeitungen (Export, OCR)

### Stufe 2: Supabase Edge Functions fuer langlebige Jobs (Phase 1)

Deno-basierte Serverless Functions mit **150 Sekunden Timeout** (3x Vercel) und Zugang zur Supabase-Datenbank:

**Einsatzbereich:**
- **OCR-Indexierung** (PROJ-5): Edge Function wird nach Upload getriggert, verarbeitet das Dokument, schreibt OCR-Text in die Datenbank
- **PDF/A-Generierung** (PROJ-6): Edge Function mit `deno-puppeteer` oder einem PDF-Service-Aufruf
- **Datenexport** (PROJ-8): Edge Function orchestriert den Export, schreibt Chunks in Supabase Storage

**Architektur-Pattern:**

```
API-Route (Vercel, < 55s)
  |
  ├── Schnelle Operationen: direkt ausfuehren (CRUD, Validierung)
  |
  └── Langlebige Operationen: Job in DB-Tabelle `background_jobs` schreiben
        |
        ├── pg_cron (periodisch): Prueft `background_jobs` alle 60s auf neue Jobs
        |     └── Ruft Edge Function per HTTP auf
        |
        └── Direkt-Trigger (nach Upload): Supabase Database Webhook
              └── Ruft Edge Function per HTTP auf

Edge Function (Supabase, < 150s)
  |
  ├── Verarbeitung ausfuehren (OCR, PDF, Export-Chunk)
  ├── Status in `background_jobs` aktualisieren (pending -> processing -> completed/failed)
  └── Bei Fertigstellung: Benachrichtigung (In-App oder E-Mail)
```

### Job-Tabelle

```sql
CREATE TABLE background_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  type text NOT NULL,              -- 'ocr', 'pdf_generation', 'export', 'frist_erinnerung'
  status text NOT NULL DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
  input jsonb NOT NULL DEFAULT '{}',       -- Job-spezifische Eingabedaten
  output jsonb,                            -- Ergebnis oder Fehlerdetails
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id)
);

-- RLS: Nur eigener Tenant sieht eigene Jobs
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON background_jobs
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
-- INSERT/UPDATE nur ueber Service-Role (Backend schreibt Jobs)
CREATE POLICY "deny_client_insert" ON background_jobs FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_client_update" ON background_jobs FOR UPDATE USING (false);
CREATE POLICY "deny_client_delete" ON background_jobs FOR DELETE USING (false);
```

### API-Pattern fuer asynchrone Endpunkte

```typescript
// POST /api/export/start
// 1. Auth pruefen
// 2. Job in background_jobs schreiben (status: 'pending')
// 3. Sofort zurueck: { jobId, status: 'pending' }

// GET /api/export/[jobId]/status
// 1. Auth pruefen
// 2. Job-Status aus background_jobs lesen
// 3. Zurueck: { jobId, status, progress?, downloadUrl? }
```

### Sicherung gegen verlorene Jobs

- `pg_cron` Job alle 5 Minuten: Prueft auf Jobs mit `status = 'processing'` und `started_at < now() - interval '10 minutes'` -- setzt diese auf `status = 'failed'` zurueck
- Retry-Logik: Jobs mit `status = 'failed'` und `attempts < max_attempts` werden erneut auf `pending` gesetzt
- Dead-Letter: Jobs mit `attempts >= max_attempts` bleiben auf `failed` und werden im Admin-Dashboard angezeigt

## Alternativen verworfen

### 1. Vercel Cron Jobs
- **Pro:** Nativ in Vercel integriert, einfache Konfiguration in `vercel.json`
- **Contra:** Ruft nur HTTP-Endpunkte auf mit dem gleichen 55s-Timeout. Loest das Kernproblem (langlebige Verarbeitung) nicht. Erfordert Vercel Pro-Plan.
- **Fazit:** Nicht ausreichend fuer OCR, PDF, Export.

### 2. Externer Queue-Dienst (Inngest, QStash, BullMQ)
- **Pro:** Robuste Job-Queue mit Retry, Scheduling, Monitoring. Inngest hat gute Vercel-Integration.
- **Contra:** Zusaetzlicher externer Dienst (Kosten, Vendor-Abhaengigkeit, Datenresidenz-Frage bei US-Anbietern). Fuer ein Lean-Startup-Team im MVP Overengineering.
- **Fazit:** Fuer spaetere Skalierung (50+ Tenants) evaluieren. Im MVP nicht noetig.

### 3. Eigener Worker-Server (Hetzner, Fly.io)
- **Pro:** Volle Kontrolle, keine Timeout-Limits, deutsches Hosting moeglich.
- **Contra:** Eigener Server = eigenes Ops (Monitoring, Updates, Skalierung). Widerspricht dem Lean-Startup-Ansatz in Phase 0/1. Erfordert DevOps-Kapazitaet.
- **Fazit:** Option fuer Phase 2 (Self-Hosted), wenn Supabase Edge Functions nicht ausreichen.

### 4. Nur Vercel (alles synchron, Chunking)
- **Pro:** Kein zusaetzlicher Service.
- **Contra:** Export von 10.000 Vorgaengen ist nicht in 55s machbar, auch nicht mit Chunking. PDF-Generierung ohne Chromium auf Vercel unmoeglich. Keine Loesung.
- **Fazit:** Technisch nicht machbar.

## Konsequenzen

### Positiv
- Kein zusaetzlicher externer Dienst -- alles laeuft in der bestehenden Supabase-Instanz
- Edge Functions sind im Supabase-Pro-Plan enthalten (keine Zusatzkosten)
- `background_jobs`-Tabelle ist mandantenfaehig (RLS) und auditierbar
- Services (ADR-003) werden nicht veraendert -- sie schreiben Jobs statt direkt zu verarbeiten
- Retry-Logik und Dead-Letter-Handling sind eingebaut
- Spaetere Migration zu externem Queue-Dienst ist moeglich (Job-Tabelle bleibt, nur Trigger aendert sich)

### Negativ / Risiken
- Supabase Edge Functions basieren auf Deno, nicht Node.js -- NPM-Pakete sind eingeschraenkt verfuegbar
- 150s Timeout ist besser als 55s, aber fuer sehr grosse Exporte (100.000 Vorgaenge) moeglicherweise nicht ausreichend -- Chunking-Strategie noetig
- `deno-puppeteer` fuer PDF-Generierung in Edge Functions ist experimentell -- Fallback auf externen PDF-Service evaluieren (ADR-010)
- pg_cron erfordert Supabase Pro-Plan oder Self-Hosted

### Neutral
- Die Service-Architektur (ADR-003) unterstuetzt das Pattern bereits: Services sind unabhaengig vom Aufrufer (API-Route oder Edge Function)
- Supabase Database Webhooks koennen als Alternative zu pg_cron fuer Event-basierte Trigger genutzt werden
- Die `background_jobs`-Tabelle ist Service-Only (deny-all RLS fuer Client, SELECT nur fuer eigenen Tenant)

## Skalierungspfad

| Phase | Loesung | Kapazitaet |
|---|---|---|
| Entwicklung (lokal) | Lokale Node.js-Worker + node-cron | Einzelentwickler, unbegrenzte Laufzeit |
| Phase 0-1 (MVP/Pilot) | pg_cron + Supabase Edge Functions | 1-3 Tenants, moderate Last |
| Phase 2 (Pilot+) | + Supabase Database Webhooks fuer Event-Trigger | 5-10 Tenants |
| Phase 3 (Skalierung) | Eigener Worker-Service auf Hetzner oder Inngest | 50+ Tenants |

## Betroffene Features und Zuordnung

| Feature | Job-Typ | Trigger | Verarbeitung |
|---|---|---|---|
| PROJ-4 Fristen | `frist_erinnerung` | pg_cron (taeglich 06:00) | API-Route (< 55s, sendet E-Mails) |
| PROJ-5 Dokumente | `ocr_indexierung` | Database Webhook (nach INSERT in dokumente) | Edge Function (< 150s) |
| PROJ-6 Bescheide | `pdf_generation` | API-Route schreibt Job | Edge Function (< 150s) |
| PROJ-8 Export | `mandanten_export` | API-Route schreibt Job | Edge Function (Chunked, mehrere Aufrufe) |

## Beteiligte Rollen

| Rolle | Verantwortung |
|---|---|
| Senior Software Architect | Architekturentscheidung, Skalierungspfad |
| Senior Backend Developer | Implementierung Job-Tabelle, pg_cron-Setup, Edge Functions |
| Database Architect | `background_jobs`-Schema, pg_cron-Konfiguration, RLS-Policies |
| DevOps/Platform Engineer | Supabase Edge Functions Deployment, Monitoring, Alerting |
| Senior Security Engineer | RLS auf Job-Tabelle, CRON_SECRET-Management, Edge Function Auth |
| Senior QS Engineer | Job-Lifecycle-Tests (pending -> processing -> completed/failed), Retry-Tests |

## Referenzen
- ADR-003: Service-Architektur (Services muessen aus Queue-Workern aufrufbar sein)
- PROJ-4: Fristmanagement (Erinnerungs-Cron, offene Frage 2)
- PROJ-5: Dokumentenverwaltung (OCR asynchron, FA-8)
- PROJ-8: Datenexport (asynchron, NFR-4, offene Frage 3)
- Kick-off-Protokoll: Identifiziert als kritischster Blocker durch alle 7 Rollen
