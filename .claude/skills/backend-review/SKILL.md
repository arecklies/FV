---
name: backend-review
description: Prüft Backend-Code auf Qualität, Sicherheit, RLS, Zod-Validierung, Performance und Einhaltung von backend.md, security.md und testing.md. Aufruf mit /backend-review [PROJ-X oder Dateipfad]
---

Lies zuerst:
- Zu prüfende Dateien: `git diff` oder explizit angegebene Dateien
- `.claude/rules/backend.md`, `.claude/rules/security.md`, `.claude/rules/testing.md`

Agiere als **Senior Backend Developer** gemäß `.claude/agents/senior-backend-developer.md`.

## Aufgabe
Führe ein Backend-Code-Review durch.

## Prüfpunkte
1. RLS auf allen neuen Tabellen aktiviert (SELECT / INSERT / UPDATE / DELETE)?
2. Alle Eingaben serverseitig mit Zod validiert?
3. Authentifizierung bei jedem Endpunkt geprüft?
4. `.limit()` auf allen Listen-Queries gesetzt?
5. Keine Secrets im Code (inkl. `.env`-Variablen korrekt verwendet)?
6. N+1-Query-Muster vorhanden?
7. Fehlerbehandlung vollständig (korrekte HTTP-Status-Codes)?
8. Transport / Domäne / Infrastruktur sauber getrennt?
9. Testcode angepasst? Neue Logik ohne Tests? (gemäß `.claude/rules/testing.md`)
10. Commit-Format korrekt: `type(PROJ-X): description`?

## Ausgabe
- Review-Befunde (kritisch / major / minor)
- Konkrete Code-Verbesserungen
- Sicherheitsbefunde
- **Nächster Schritt:** `/sec-review` bei sicherheitsrelevanten Befunden oder `/qs-review` wenn Review abgeschlossen
