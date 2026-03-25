---
name: sec-audit
description: Führt vollständigen Sicherheits-Audit durch. Prüft RLS, Auth, Zod-Validierung, Secrets, Security Headers, Tenant-Isolation und OWASP Top 10. Erstellt strukturierten Eskalations-Bericht bei kritischen Befunden. Aufruf mit /sec-audit [PROJ-X oder Dateipfad]
---

Lies zuerst:
- API-Routen: `git ls-files src/app/api/`
- Datenbankzugriffe: `git ls-files src/`
- RLS-Policies: `supabase/migrations/`
- Feature-Spec: `features/PROJ-X-*.md` falls vorhanden
- `.claude/rules/security.md`
- `.claude/rules/testing.md` – RLS-Tests und Qualitätsgates verifizieren

Agiere als **Senior Security Engineer** gemäß `.claude/agents/senior-security-engineer.md`.

## Aufgabe
Führe einen vollständigen Sicherheits-Audit durch.

## Prüfpunkte
1. RLS auf allen Tabellen aktiviert und vollständig (SELECT / INSERT / UPDATE / DELETE)?
2. Alle Eingaben serverseitig mit Zod validiert?
3. Authentifizierung bei jedem API-Endpunkt geprüft?
4. Keine Secrets im Code (`NEXT_PUBLIC_`-Prefix korrekt verwendet)?
5. Alle Umgebungsvariablen in `.env.local.example` dokumentiert?
6. Security Headers konfiguriert (X-Frame-Options, HSTS, CSP, nosniff)?
7. Rate Limiting auf Auth-Endpunkten?
8. **Cross-Tenant-Zugriff möglich? → sofortige Eskalation (siehe unten)**
9. OWASP Top 10: Injection, XSS, IDOR, SSRF, Broken Auth geprüft?

## Cross-Tenant-Eskalation (Pflicht bei Fund)
1. Arbeit sofort stoppen – kein selbstständiges Weitermachen
2. Security-Eskalations-Bericht erstellen:
```markdown
## Security-Eskalation: [Befund-Titel]
**Schwere:** KRITISCH
**Typ:** Cross-Tenant / Auth-Bypass / Datenleck
**Datum:** YYYY-MM-DD
### Beschreibung: [Was ist das Risiko?]
### Betroffene Komponenten: [Dateien / Endpunkte / Tabellen]
### Reproduktion: [Schritte]
### Empfohlene Sofortmaßnahme: [Was muss als nächstes getan werden?]
```
3. Nutzer direkt informieren → Empfehlung: `/po-backlog` für sofortige Priorisierung

## Ausgabe
- Sicherheitsbefunde (kritisch / major / minor)
- Security-Eskalations-Bericht (bei Cross-Tenant oder kritischen Befunden)
- Compliance-Status (DSGVO / SOC 2)
- Schutzmaßnahmen
- **Nächster Schritt:** `/sec-review` für Code-Korrekturen oder `/po-backlog` bei kritischer Eskalation
