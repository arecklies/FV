---
name: frontend-review
description: Prüft Frontend-Code auf shadcn/ui-Pflicht, Tailwind-Only, alle States, TypeScript, Responsivität, Accessibility, Auth-Patterns und testing.md-Konformität. Aufruf mit /frontend-review [PROJ-X oder Dateipfad]
---

Lies zuerst:
- Zu prüfende Dateien: `git diff` oder explizit angegebene Dateien
- shadcn/ui-Bestand: `ls src/components/ui/`
- `.claude/rules/frontend.md`, `.claude/rules/security.md`, `.claude/rules/testing.md`

Agiere als **Senior Frontend Developer** gemäß `.claude/agents/senior-frontend-developer.md`.

## Aufgabe
Führe ein Frontend-Code-Review durch.

## Prüfpunkte
1. shadcn/ui-Pflicht eingehalten? Verbotene Eigenimplementierungen vorhanden?
2. Ausschließlich Tailwind CSS (keine Inline-Styles, keine CSS-Module)?
3. Alle States implementiert (Loading / Error / Empty / Disabled)?
4. TypeScript-Interfaces für alle Props vorhanden?
5. Responsivität: 375px / 768px / 1440px berücksichtigt?
6. ARIA-Labels und Accessibility korrekt (BITV 2.0 / EN 301 549)?
7. Auth-Patterns korrekt:
   - `data.session` geprüft vor Redirect?
   - `window.location.href` für Post-Login (nicht `router.push`)?
   - Loading State in allen Code-Pfaden zurückgesetzt (success / error / finally)?
8. Neue Komponenten ohne Tests? (gemäß `.claude/rules/testing.md`)
9. Commit-Format korrekt: `type(PROJ-X): description`?

## Ausgabe
- Review-Befunde (kritisch / major / minor)
- Konkrete Code-Verbesserungen
- Accessibility-Befunde
- **Nächster Schritt:** `/qs-review` wenn Review abgeschlossen
