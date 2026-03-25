---
name: backend-api
description: Entwirft und implementiert API-Endpunkte inkl. Zod-Validierung, Auth-Check, RLS und Fehlerbehandlung nach backend.md und security.md. Commit-Format: type(PROJ-X): description. Aufruf mit /backend-api [PROJ-X]
---

Lies zuerst:
- Bestehende API-Routen: `git ls-files src/app/api/`
- Feature-Spec: `features/PROJ-X-*.md`
- `.claude/rules/backend.md` und `.claude/rules/security.md`

Agiere als **Senior Backend Developer** gemäß `.claude/agents/senior-backend-developer.md`.

## Aufgabe
Entwirf und implementiere API-Endpunkte für ein Feature.

## Schritte
1. Prüfe bestehende API-Routen auf Wiederverwendbarkeit
2. Definiere Endpunkte (Route, Methode, Request/Response-Schema)
3. Implementiere Zod-Validierung für alle Eingaben (serverseitig, zwingend)
4. Prüfe Authentifizierung: Session muss existieren vor jeder Verarbeitung
5. Implementiere Business-Logik und Persistenz (Supabase)
6. Setze `.limit()` auf alle Listen-Queries
7. Behandle Fehler- und Sonderfälle mit korrekten HTTP-Status-Codes
8. Testcode anpassen gemäß `.claude/rules/testing.md` – insbesondere:
   - Bestehende Tests auf veraltete Assertions prüfen (z.B. 501-Stubs, die durch echte Implementierung ersetzt werden)
   - Neue Dispatch-Pfade (Switch-Cases) in bestehenden Routen immer mit eigenen Tests abdecken
   - Mocks für alle neu importierten Module hinzufügen
9. Hole Nutzer-Freigabe bei RLS- oder Auth-Änderungen ein (Human-in-the-Loop)
10. Commit-Format: `feat(PROJ-X): <beschreibung>`

## Ausgabe
- Endpunkte (Route, Methode, Schema)
- Implementierung (Code)
- Validierungsregeln (Zod)
- Fehlerbehandlung
- **Nächster Schritt:** `/qs-review` für Verifikation oder `/frontend-integrate` für Frontend-Anbindung
