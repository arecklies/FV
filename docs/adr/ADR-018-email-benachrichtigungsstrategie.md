# ADR-018: E-Mail-Benachrichtigungsstrategie

**Status:** Accepted
**Datum:** 2026-03-29
**Autor:** Senior Software Architect

## Kontext

PROJ-38 (E-Mail-Benachrichtigungen Fristeskalation) erfordert den automatisierten Versand von E-Mails bei Ampelwechseln im Fristmanagement. Sachbearbeiter sind nicht permanent im System eingeloggt und muessen aktiv ueber kritische Fristeskalationen informiert werden.

Die bestehende Architektur sieht bereits asynchrone Verarbeitung ueber die `background_jobs`-Tabelle vor (ADR-008) und eine strikte Service-Kapselung (ADR-003). Die E-Mail-Benachrichtigung muss sich in beide Patterns einfuegen.

### Anforderungen

- E-Mail bei Ampelwechsel auf Gelb (Sachbearbeiter) und Rot (Sachbearbeiter + Referatsleiter)
- Duplikat-Schutz: maximal 1 E-Mail pro Frist pro Ampelwechsel pro Empfaenger
- Rate-Limiting: max. 50 E-Mails pro Cron-Lauf
- Keine personenbezogenen Daten (PII) in E-Mails: nur Aktenzeichen, Fristtyp, Restzeit, Direktlink
- Opt-out pro Nutzer, mit Ausnahme: Referatsleiter-Benachrichtigung bei Rot ist nicht abschaltbar
- Erweiterbar auf weitere Kanaele (Push, In-App) ohne Architektur-Umbau

### Constraints

- Vercel Serverless: 55s Timeout, E-Mail-Versand muss innerhalb des Cron-Lauf-Budgets bleiben
- DSGVO: EU-Datenresidenz fuer E-Mail-Provider (ADR-001)
- Keine ESM-only Dependencies im Hauptprojekt (Jest/ts-jest-Kompatibilitaet)
- Security: API-Keys nur ueber Env-Variablen, keine PII in Logs

## Entscheidung

**Resend als E-Mail-Provider mit zweischichtiger Service-Architektur: NotificationService (Eventverarbeitung, Duplikat-Schutz, Opt-out-Logik) + EmailProviderService (Provider-Abstraktion, Template-Rendering, Versand).**

### Service-Architektur

```
Cron-Job (PROJ-22, alle 15 Minuten)
  |
  +-- FristService: Ampelstatus berechnen
  +-- NotificationService: Benachrichtigungsbedarf ermitteln
  |     +-- Empfaenger bestimmen (Sachbearbeiter, ggf. Referatsleiter)
  |     +-- Duplikat-Schutz pruefen (frist_benachrichtigungen-Tabelle)
  |     +-- Opt-out-Praeferenzen pruefen (user_benachrichtigungen_config)
  |     +-- Referatsleiter-Rot: Opt-out ignorieren (AC-3)
  |     +-- Rate-Limit pruefen (max 50 pro Lauf)
  |
  +-- EmailProviderService: E-Mails versenden
        +-- Template rendern (TypeScript-Funktionen)
        +-- Resend SDK aufrufen
        +-- Ergebnis loggen (kein PII im Log)
```

### Service-Einordnung (ADR-003)

| Service | Modul | Verantwortung |
|---|---|---|
| NotificationService | `src/lib/services/notifications/` | Eventverarbeitung, Empfaengerermittlung, Duplikat-Schutz, Opt-out, Rate-Limiting |
| EmailProviderService | `src/lib/services/email/` | Provider-Abstraktion, Template-Rendering, Versand via Resend SDK |

Beide Services folgen dem ADR-003-Pattern: Supabase-Client als Parameter, kein HTTP-Kontext, typisierte Ein-/Ausgaben ueber Zod-Schemas.

### Duplikat-Schutz

Neue Tabelle `frist_benachrichtigungen` mit Unique Index auf `(frist_id, user_id, ampel_status)`:

```sql
CREATE TABLE frist_benachrichtigungen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  frist_id uuid NOT NULL REFERENCES vorgang_fristen(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ampel_status text NOT NULL,  -- 'gelb', 'rot'
  gesendet_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_frist_benachrichtigung_unique
  ON frist_benachrichtigungen(frist_id, user_id, ampel_status);

-- RLS: Service-Only (Zugriff nur ueber Service-Role im Cron-Job)
ALTER TABLE frist_benachrichtigungen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_select" ON frist_benachrichtigungen FOR SELECT USING (false);
CREATE POLICY "deny_insert" ON frist_benachrichtigungen FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_update" ON frist_benachrichtigungen FOR UPDATE USING (false);
CREATE POLICY "deny_delete" ON frist_benachrichtigungen FOR DELETE USING (false);

-- Ampel-Reset: Bei Fristverlaengerung oder Rueckfall auf Gruen werden
-- bestehende Benachrichtigungs-Eintraege geloescht, damit bei erneutem
-- Anstieg eine neue Benachrichtigung versendet werden kann.
-- Der FristService ruft nach verlaengereFrist() / hebeHemmungAuf():
--   DELETE FROM frist_benachrichtigungen WHERE frist_id = :fristId;
```

Vor jedem Versand: `INSERT ... ON CONFLICT DO NOTHING`. Wenn kein Insert erfolgt, wurde bereits benachrichtigt.

### Opt-out-Konfiguration

Neue Tabelle `config_user_benachrichtigungen` (Prefix `config_` konsistent mit bestehendem Naming-Pattern):

```sql
CREATE TABLE config_user_benachrichtigungen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  user_id uuid NOT NULL UNIQUE,
  email_frist_gelb boolean NOT NULL DEFAULT true,
  email_frist_rot boolean NOT NULL DEFAULT true,  -- Wird fuer Referatsleiter ignoriert (AC-3)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: Service-Only (Zugriff ueber Service-Role im Backend)
-- User-Einstellungen werden ueber dedizierte API-Route gelesen/geschrieben
ALTER TABLE config_user_benachrichtigungen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_select" ON config_user_benachrichtigungen FOR SELECT USING (false);
CREATE POLICY "deny_insert" ON config_user_benachrichtigungen FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_update" ON config_user_benachrichtigungen FOR UPDATE USING (false);
CREATE POLICY "deny_delete" ON config_user_benachrichtigungen FOR DELETE USING (false);
```

Abfrage-Logik im NotificationService:
- Kein Eintrag vorhanden: Standardwerte gelten (beide aktiviert)
- `email_frist_rot = false` wird ignoriert fuer Referatsleiter (Geschaeftsregel AC-3)

### E-Mail-Templates

Templates als TypeScript-Funktionen (kein Handlebars, kein externer Template-Engine):

```typescript
// src/lib/services/email/templates/frist-eskalation.ts
export function renderFristEskalation(data: {
  aktenzeichen: string | null;
  fristTyp: string;
  restzeit: string;
  ampelStatus: 'gelb' | 'rot';
  direktLink: string;
}): { subject: string; html: string; text: string } { ... }
```

Vorteile: Typsicherheit, keine zusaetzliche Dependency, testbar mit Unit-Tests.

### Rate-Limiting

- Zaehler pro Cron-Lauf: max. 50 E-Mails
- Bei Erreichen des Limits: verbleibende Benachrichtigungen im naechsten Cron-Lauf verarbeiten (kein Datenverlust, da Duplikat-Schutz nur bei erfolgreichem Versand greift)
- Slot wird erst nach erfolgreichem Versand gezaehlt (nicht bei Validierungsfehler)

### MVP-Versandmodus

Im MVP erfolgt der E-Mail-Versand inline am Ende des Cron-Laufs (synchron im selben Request). Das ist akzeptabel, weil:
- Max. 50 E-Mails x ~200ms pro Resend-Call = ~10s (innerhalb des 55s-Budgets)
- Der Cron-Lauf selbst (Ampelberechnung) benoetigt typischerweise < 5s

Fuer Skalierung (Phase 2+): Versand ueber separaten `background_jobs`-Eintrag mit Typ `email_notification`, verarbeitet durch Worker (ADR-008 Stufe 2).

### Erweiterbarkeit auf weitere Kanaele

Der NotificationService ist kanal-agnostisch: Er ermittelt *ob* und *wen* benachrichtigt werden soll. Der konkrete Kanal (E-Mail, Push, In-App) wird durch spezialisierte Provider-Services bedient:

```
NotificationService
  +-- EmailProviderService    (PROJ-38, Phase 1)
  +-- PushProviderService     (spaeter)
  +-- InAppProviderService    (spaeter)
```

Neue Kanaele erfordern:
1. Neuen ProviderService unter `src/lib/services/<kanal>/`
2. Neue Spalte in `user_benachrichtigungen_config` (z.B. `push_frist_gelb`)
3. Aufruf im NotificationService nach Duplikat- und Opt-out-Pruefung

### Neue Umgebungsvariable

```
RESEND_API_KEY=re_xxxxxxxxxx
```

Eintrag in `.env.local.example` erforderlich. Existenz-Check vor dem ersten Versand (HTTP 500 bei fehlendem Key, kein Streaming starten).

## Begruendung

### Warum Resend?

| Kriterium | Resend | Supabase Auth SMTP | SendGrid | Postmark |
|---|---|---|---|---|
| EU-Datenresidenz | Ja (EU-Region) | Nein (US, shared SMTP) | Nein (US, EU nur Enterprise) | Nein (US only) |
| DSGVO-Konformitaet | DPA verfuegbar | Nicht fuer Custom-Mails vorgesehen | DPA moeglich, aber US-Hosting | DPA moeglich, aber US-Hosting |
| SDK-Kompatibilitaet | CommonJS + ESM | Kein SDK (SMTP) | CommonJS + ESM | CommonJS + ESM |
| Preis (MVP) | 3.000 Mails/Monat kostenlos | Inkludiert (nur Auth-Mails) | 100 Mails/Tag kostenlos | 100 Mails/Monat kostenlos |
| Deliverability | Hoch (eigene IP-Pools) | Niedrig (shared) | Hoch | Sehr hoch |
| SPF/DKIM | Automatisch | Nicht konfigurierbar | Ja | Ja |
| Komplexitaet | Gering (SDK, 3 Zeilen) | Hoch (SMTP-Config, kein Tracking) | Mittel | Mittel |

Resend ist der einzige evaluierte Provider mit EU-Hosting und einem kostenlosen Tier, das fuer den MVP ausreicht. Die CommonJS-Kompatibilitaet vermeidet ESM-Probleme mit Jest.

### Warum zweischichtige Architektur?

1. **Separation of Concerns**: NotificationService entscheidet *ob*, EmailProviderService entscheidet *wie*
2. **Provider-Austauschbarkeit**: Wechsel von Resend zu anderem Provider aendert nur EmailProviderService
3. **Testbarkeit**: NotificationService testbar ohne E-Mail-Versand (EmailProviderService wird gemockt)
4. **ADR-003-Konformitaet**: Beide Services sind eigenstaendige Module mit klar definierten Schnittstellen

### Warum TypeScript-Templates statt Template-Engine?

- Typsicherheit: Template-Daten werden zur Compile-Zeit geprueft
- Keine Dependency: Kein Handlebars, Mustache oder aehnliches
- Unit-testbar: Reine Funktionen, Snapshot-Tests moeglich
- Performance: Kein Parsing zur Laufzeit

## Konsequenzen

### Positiv

- Klare Trennung zwischen Benachrichtigungslogik und Versandmechanismus
- Duplikat-Schutz auf Datenbankebene (race-condition-sicher durch Unique Index)
- Keine PII in E-Mails und Logs (NFR-2 und security.md)
- Provider-Wechsel ohne Architektur-Aenderung moeglich
- Erweiterbar auf Push und In-App ohne Umbau des NotificationService
- Rate-Limiting schuetzt vor Massenversand bei Datenmigration oder Fehlkonfiguration

### Negativ / Risiken

- Neue externe Abhaengigkeit (Resend): Ausfall des Providers verzoegert Benachrichtigungen. Mitigation: Retry im naechsten Cron-Lauf, kein Datenverlust durch Duplikat-Schutz-Design
- Zwei neue Tabellen (frist_benachrichtigungen, user_benachrichtigungen_config): erhoehen Schema-Komplexitaet. Beide Tabellen sind schmal und klar abgegrenzt
- MVP-Inline-Versand skaliert nicht ueber ~50 Mails/Lauf. Mitigation: Skalierungspfad ueber background_jobs (ADR-008) ist vorbereitet

### Neutral

- Resend Free Tier (3.000 Mails/Monat) reicht fuer MVP mit 1-3 Tenants. Bei Skalierung: Pro-Plan (ab $20/Monat)
- Die `frist_benachrichtigungen`-Tabelle dient gleichzeitig als Audit-Trail fuer versendete Benachrichtigungen

## Alternativen verworfen

### 1. Supabase Auth SMTP (Built-in)

- **Pro:** Keine zusaetzliche Abhaengigkeit, bereits konfiguriert fuer Auth-Mails
- **Contra:** Supabase Auth SMTP ist ausschliesslich fuer Auth-Flows (Signup, Password Reset) vorgesehen. Custom-Mails sind nicht unterstuetzt. Shared SMTP-Server hat niedrige Deliverability, kein SPF/DKIM fuer eigene Domain, kein Tracking, US-Hosting.
- **Fazit:** Technisch nicht geeignet fuer Custom-Benachrichtigungen.

### 2. SendGrid (Twilio)

- **Pro:** Marktfuehrer, umfangreiche API, gute Dokumentation, 100 Mails/Tag kostenlos
- **Contra:** US-Hosting (kein EU-Rechenzentrum im Free/Pro-Tier), DSGVO-Risiko ohne Standardvertragsklauseln. EU-Region nur im Enterprise-Plan. SDK ist CommonJS-kompatibel.
- **Fazit:** DSGVO-Risiko bei US-Hosting. Fuer eine Behoerden-Anwendung nicht akzeptabel ohne EU-Datenresidenz.

### 3. Postmark

- **Pro:** Hoechste Deliverability-Raten, exzellentes Tracking, saubere API
- **Contra:** US-only Hosting (keine EU-Region), 100 Mails/Monat im Free-Tier (zu wenig fuer MVP). DSGVO-Risiko analog zu SendGrid.
- **Fazit:** Technisch ueberlegen bei Deliverability, aber EU-Datenresidenz fehlt.

### 4. Separater E-Mail-Worker ab Tag 1

- **Pro:** Saubere Entkopplung, keine Verlaengerung des Cron-Laufs
- **Contra:** Zusaetzlicher background_jobs-Typ, Worker-Infrastruktur, hoehere Komplexitaet fuer MVP mit < 50 Mails/Lauf. Das dreistufige Modell (ADR-008) sieht den Uebergang zu separaten Workern explizit fuer Phase 2 vor.
- **Fazit:** Overengineering fuer MVP. Skalierungspfad ist vorbereitet.

## Skalierungspfad

| Phase | Versandmodus | Kapazitaet |
|---|---|---|
| MVP (lokal) | Inline im Cron-Lauf | max. 50 Mails/Lauf |
| Phase 1 (Pilot) | Inline im Cron-Lauf, 15-Minuten-Intervall | ~200 Mails/Stunde |
| Phase 2 (Skalierung) | Separater Worker via background_jobs (ADR-008) | Unbegrenzt (Worker-skaliert) |
| Phase 3 (Multi-Kanal) | NotificationService + mehrere ProviderServices | E-Mail + Push + In-App |

## Referenzen

- **ADR-003:** Service-Architektur und Kapselung -- NotificationService und EmailProviderService folgen dem Service-Schnitt-Pattern
- **ADR-008:** Asynchrone Verarbeitung und Background Jobs -- Skalierungspfad fuer separaten E-Mail-Worker in Phase 2
- **PROJ-38:** E-Mail-Benachrichtigungen Fristeskalation -- Feature-Spec mit User Stories und Akzeptanzkriterien
- **PROJ-22:** Cron-Job fuer Fristberechnung -- Integrationspunkt fuer E-Mail-Trigger
- **PROJ-4:** Fristmanagement -- Ampelwechsel als ausloesende Events
