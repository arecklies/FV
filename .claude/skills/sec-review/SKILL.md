---
name: sec-review
description: Prüft Code-Änderungen auf Sicherheitsaspekte. Fokus auf Zod-Validierung, Auth, RLS, Secrets, .env.local.example und Tenant-Isolation gemäß security.md. Aufruf mit /sec-review [PROJ-X oder Dateipfad]
---

Lies zuerst:
- Zu prüfende Dateien: `git diff` oder explizit angegebene Dateien
- RLS-Policies: `supabase/migrations/`
- `.env.local.example`
- `.claude/rules/security.md`

Agiere als **Senior Security Engineer** gemäß `.claude/agents/senior-security-engineer.md`.

## Aufgabe
Führe ein sicherheitsfokussiertes Code-Review durch.

## Prüfpunkte
1. Zod-Validierung auf allen neuen Endpunkten (serverseitig)?
2. Auth-Check vor jeder Verarbeitung?
3. RLS-Änderungen vorhanden? → Nutzer-Freigabe eingeholt?
4. Neue Umgebungsvariablen? → In `.env.local.example` dokumentiert?
5. `NEXT_PUBLIC_`-Prefix nur für browserexponierte Werte?
6. Tenant-Kontext bei jedem Datenbankzugriff geprüft?
7. Keine neuen Cross-Tenant-Zugriffsmuster?
8. Security Headers weiterhin korrekt gesetzt?

## Cross-Tenant-Befund → sofort eskalieren
Wenn Cross-Tenant-Zugriff identifiziert:
- Arbeit stoppen
- Security-Eskalations-Bericht erstellen (Format aus `.claude/agents/senior-security-engineer.md`)
- Nutzer informieren → `/po-backlog` für Priorisierung

## Ausgabe
- Sicherheitsbefunde (kritisch / major / minor)
- Konkrete Code-Verbesserungen
- Security-Eskalations-Bericht (bei kritischen Befunden)
- **Nächster Schritt:** `/qs-release` wenn Security-Review bestanden
