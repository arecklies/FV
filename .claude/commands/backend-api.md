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
8. Testcode **parallel zur Implementierung** schreiben (nicht erst bei QS-Review):
   - Bestehende Tests auf veraltete Assertions prüfen (z.B. 501-Stubs, die durch echte Implementierung ersetzt werden)
   - Neue Dispatch-Pfade (Switch-Cases) in bestehenden Routen immer mit eigenen Tests abdecken
   - Mocks für alle neu importierten Module hinzufügen
   - **Coverage-Check VOR Commit (Pflicht):** `npx jest --forceExit --coverage` — neue Dateien unter `src/lib/services/` muessen >= 80% haben
9. **Error-Leakage-Selbstpruefung (Pflicht VOR QS-Uebergabe):**
   - `grep -rn "result.error\|error.message" <neue-route-dateien>` ausfuehren
   - Jeder Treffer pruefen: Wird der Wert an den Client zurueckgegeben (`jsonResponse({ error: ... })`)?
   - Nur kontrollierte, selbst formulierte Meldungen an Client — Supabase/DB-Fehler IMMER ueber `serverError()` leiten
   - Referenz: `.claude/rules/security.md` Abschnitt "Error-Leakage-Verbot"
10. Hole Nutzer-Freigabe bei RLS- oder Auth-Änderungen ein (Human-in-the-Loop)
11. Zeichensatz-Prüfung (bei deutschen Texten in geänderten Dateien):
    - `grep -rn` auf ASCII-Ersetzungen (ae/oe/ue statt ä/ö/ü) prüfen
    - UTF-8-Umlaute (ä, ö, ü, ß) verwenden, KEINE ASCII-Ersetzungen
12. Commit-Format: `feat(PROJ-X): <beschreibung>`

## Ausgabe
- Endpunkte (Route, Methode, Schema)
- Implementierung (Code)
- Validierungsregeln (Zod)
- Fehlerbehandlung
- **Nächster Schritt:** `/qs-review` für Verifikation oder `/frontend-integrate` für Frontend-Anbindung
