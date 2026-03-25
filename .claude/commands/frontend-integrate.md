---
name: frontend-integrate
description: Bindet Frontend-Komponenten an Backend-APIs an. Implementiert API-Calls, State Management, Error Handling, Loading States und Supabase-Auth-Patterns. Commit-Format: type(PROJ-X): description. Aufruf mit /frontend-integrate [PROJ-X]
---

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
6. Testcode anpassen gemäß `.claude/rules/testing.md`
7. Commit-Format: `feat(PROJ-X): <beschreibung>`

## Ausgabe
- Implementierte API-Integration (Code)
- Error-Handling-Strategie
- State-Management-Beschreibung
- **Nächster Schritt:** `/qs-review` für Verifikation
