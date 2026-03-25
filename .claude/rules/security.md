# Security Rules

> Diese Regeln gelten primär für den **Senior Security Engineer** (`.claude/agents/senior-security-engineer.md`).
> Der **Senior Backend Developer** (`.claude/agents/senior-backend-developer.md`) beachtet „Secrets Management" und „Input Validation" bei jeder Implementierung.
> Der **DevOps/Platform Engineer** (`.claude/agents/devops-platform-engineer.md`) beachtet „Secrets Management" und „Security Headers" bei Deployment und Konfiguration.
> Der **Database Architect** (`.claude/agents/database-architect.md`) beachtet „Authentication" im Kontext von RLS und Tenant-Isolation.

## Secrets Management
- Secrets, API-Keys und Credentials NIEMALS in Git committen
- `.env.local` für lokale Entwicklung verwenden (liegt in `.gitignore`)
- `NEXT_PUBLIC_`-Prefix NUR für Werte, die sicher im Browser exponiert werden dürfen
- Alle benötigten Umgebungsvariablen in `.env.local.example` mit Dummy-Werten dokumentieren
- Neue Umgebungsvariablen erfordern Eintrag in `.env.local.example` (Human-in-the-Loop)

## Input Validation
- ALLE Nutzereingaben serverseitig mit **Zod** validieren
- Clientseitige Validierung allein ist nicht ausreichend
- Daten vor Datenbankinsert sanitisieren
- Tenant-Kontext bei jeder Eingabe prüfen – kein Cross-Tenant-Zugriff möglich

## Authentication
- Authentifizierung vor jeder API-Verarbeitung prüfen
- Supabase RLS als zweite Verteidigungslinie verwenden
- Rate Limiting auf Authentifizierungs-Endpunkten implementieren
- Session-Validierung nie clientseitig allein durchführen

## Security Headers
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-XSS-Protection: 0
Permissions-Policy: camera=(), microphone=(), geolocation=()
```
- `X-XSS-Protection: 0` — deaktiviert den veralteten XSS-Auditor (XSS-Schutz erfolgt ueber CSP, siehe PROJ-38)
- Content-Security-Policy: im Report-Only-Modus aktiv (PROJ-38). Auf Enforcing umstellen nach Auswertung der Browser-Konsolen-Violations.
- **Verifikation:** Nach jeder Aenderung an Security Headers: `grep -n "X-XSS-Protection\|Content-Security-Policy\|X-Frame-Options" src/lib/api/security-headers.ts next.config.ts` ausfuehren und gegen diese Liste abgleichen
- Security Headers muessen auch auf manuell konstruierte Responses (z.B. Streaming/SSE) gesetzt werden
- CORS: Keine `Access-Control-Allow-Origin`-Header setzen, solange nur Same-Origin-Zugriff benoetigt wird. Bei Bedarf fuer Cross-Origin: explizit erlaubte Origins als Allowlist, nie `*`

## Rate-Limiting
- Externe API-Kosten durch Rate-Limiting schuetzen
- In-Memory Rate-Limiting funktioniert NICHT zuverlaessig auf Serverless (Vercel) - als MVP-Einschraenkung dokumentieren
- Fuer Produktion: Vercel KV oder Upstash Redis verwenden
- Rate-Limit-Slot erst nach erfolgreicher Verarbeitung zaehlen (nicht bei Validierungsfehler)

## Logging
- Keine Secrets (API-Keys, Tokens, Passwoerter) in Log-Output — auch nicht teilweise maskiert
- Keine personenbezogenen Daten (PII) in Logs, sofern nicht fuer Fehleranalyse zwingend erforderlich
- Externe Fehlerdetails (Stack Traces, SDK-Meldungen) nur serverseitig loggen, nie an Client weiterleiten
- **Error-Leakage-Verbot**: `err.message`, `error.message`, `insertError.message` NIEMALS direkt in API-Responses verwenden
- Stattdessen: generische Meldung an Client, Details nur via `console.error()` ins Server-Log
- Erlaubt: Selbst formulierte, kontrollierte Fehlertexte (z.B. "Meldung konnte nicht erzeugt werden")
- Log-Prefixes nach Feature-ID: `[PROJ-X]` oder `[SEC-HOTFIX-X]` fuer Zuordnung

## Multi-Tenancy Security
- Tenant-Isolation auf Datenbankebene (RLS oder Schema-Separation) sicherstellen
- Jede API-Route muss den Tenant-Kontext des aufrufenden Users validieren
- Cross-Tenant-Zugriffe sind ein kritischer Befund → sofortige Eskalation an Product Owner, kein Weitermachen

## Code Review Trigger (Human-in-the-Loop)
> Autoritative Liste: `CLAUDE.md` Abschnitt „Human-in-the-Loop"

- Änderungen an RLS-Policies → explizite Nutzer-Freigabe erforderlich
- Änderungen am Auth-Flow → explizite Nutzer-Freigabe erforderlich
- Neue Umgebungsvariablen → Dokumentation in `.env.local.example` erforderlich
- Cross-Tenant-Zugriffsmuster → sofortige Eskalation, kein selbstständiges Fortfahren
