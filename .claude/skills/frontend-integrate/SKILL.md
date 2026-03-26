---
name: frontend-integrate
description: Bindet Frontend-Komponenten an Backend-APIs an. Implementiert API-Calls, State Management, Error Handling, Loading States und Supabase-Auth-Patterns. Commit-Format: type(PROJ-X): description. Aufruf mit /frontend-integrate [PROJ-X]
---

## Voraussetzung (STOPP bei Verletzung)
1. Prüfe `features/INDEX.md`: Existiert ein Eintrag für die angeforderte PROJ-ID?
2. Prüfe `features/PROJ-X-*.md`: Existiert eine Feature-Spec mit mindestens 1 User Story?
Wenn beides nicht erfüllt: **STOPP. Keinen Code schreiben.** Nutzer informieren:
"Feature hat keine Spec / keinen INDEX-Eintrag. Nächster Schritt: `/po-backlog`."

Lies zuerst:
- API-Dokumentation vom Backend Developer (Feature-Spec: `features/PROJ-X-*.md`)
- Bestehende API-Aufrufe im Frontend: `git ls-files src/`
- `.claude/rules/frontend.md` – Auth Best Practices
- `.claude/rules/security.md` – Input Validation

Agiere als **Senior Frontend Developer** gemäß `.claude/agents/senior-frontend-developer.md`.

## Aufgabe
Binde Frontend-Komponenten an Backend-APIs an.

## Schritte
1. Analysiere API-Kontrakte (Request/Response-Modelle, Fehlermodelle)
2. Implementiere API-Calls mit korrektem Error Handling
3. Implementiere Loading State für alle asynchronen Operationen
4. Supabase Auth-Pflichtregeln (gemäß `.claude/rules/frontend.md`):
   - `data.session` prüfen, bevor weitergeleitet wird
   - `window.location.href` für Post-Login-Redirect (nicht `router.push`)
   - Loading State in allen Code-Pfaden zurücksetzen (success / error / finally)
5. Hole Nutzer-Freigabe bei Auth-Flow-Änderungen ein (Human-in-the-Loop)
6. Testcode **parallel zur Integration** schreiben (nicht erst bei QS-Review):
   - Komponenten-Tests (`*.test.tsx`) fuer alle neuen Komponenten unter `src/components/`
   - Hook-Tests fuer alle neuen Hooks unter `src/hooks/`
   - Mindestabdeckung: Happy Path, Loading State, Error State, Empty State
   - Dialog-Tests: Pflichtfeld-Validierung pruefen
   - **Coverage-Check VOR Commit (Pflicht):** `npx jest --forceExit --coverage` — neue Dateien muessen >= 80% haben
   - Referenz: `.claude/rules/testing.md`
7. Commit-Format: `feat(PROJ-X): <beschreibung>`

## Ausgabe
- Implementierte API-Integration (Code)
- Error-Handling-Strategie
- State-Management-Beschreibung
- **Nächster Schritt:** `/qs-review` für Verifikation
