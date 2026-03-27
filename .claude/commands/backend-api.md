---
name: backend-api
description: Entwirft und implementiert API-Endpunkte inkl. Zod-Validierung, Auth-Check, RLS und Fehlerbehandlung nach backend.md und security.md. Commit-Format: type(PROJ-X): description. Aufruf mit /backend-api [PROJ-X]
---

## Voraussetzung (STOPP bei Verletzung)
1. Prüfe `features/INDEX.md`: Existiert ein Eintrag für die angeforderte PROJ-ID?
2. Prüfe `features/PROJ-X-*.md`: Existiert eine Feature-Spec mit mindestens 1 User Story?
Wenn beides nicht erfüllt: **STOPP. Keinen Code schreiben.** Nutzer informieren:
"Feature hat keine Spec / keinen INDEX-Eintrag. Nächster Schritt: `/po-backlog`."
3. Pruefe ob bereits Implementierung existiert: `git log --oneline --grep="PROJ-X" -- src/ supabase/`
   Falls Commits gefunden: Nutzer warnen: "Implementierung fuer PROJ-X existiert bereits (X Commits). Fortfahren als Ergaenzung/Korrektur?"

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
8. **Testcode ist Pflicht-Deliverable (BLOCKER):** Kein Commit ohne Tests fuer neue/geaenderte Dateien.
   - Fuer jeden neuen Service unter `src/lib/services/`: mindestens 1 Test-Datei mit Happy Path + 1 Negativfall
   - Fuer jede neue/geaenderte API-Route unter `src/app/api/`: mindestens Validierungs- und Happy-Path-Tests
   - Bestehende Tests auf veraltete Assertions prüfen (z.B. 501-Stubs, die durch echte Implementierung ersetzt werden)
   - Neue Dispatch-Pfade (Switch-Cases) in bestehenden Routen immer mit eigenen Tests abdecken
   - Mocks für alle neu importierten Module hinzufügen
   - **Coverage-Check VOR Commit (Pflicht):** `npx jest --forceExit --coverage` — neue Dateien unter `src/lib/services/` und `src/app/api/` muessen >= 80% haben
   - **Selbst-Check:** `git diff --name-only | grep -E "\.ts$" | grep -v "\.test\."` — jede Produktiv-Datei MUSS eine zugehoerige `.test.ts`-Datei haben (neu oder aktualisiert)
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
- **AC-Prueftabelle (Pflicht):**

| AC | Implementiert | Stelle (Datei:Zeile) | Anmerkung |
|---|---|---|---|
| US-X AC-Y | ✅ / ❌ (ausgelassen) | [datei.ts:42] | [Begruendung bei Auslassung] |

- **Nächster Schritt:** `/qs-review` für Verifikation oder `/frontend-integrate` für Frontend-Anbindung
