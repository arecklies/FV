---
name: ux-review
description: Prüft bestehende UI-Komponenten oder Layouts auf Usability, Konsistenz, Accessibility und Einhaltung von frontend.md (inkl. shadcn/ui-Pflicht). Aufruf mit /ux-review [Komponente oder PROJ-X]
---

Lies zuerst:
- Relevante Komponenten-Dateien: `git ls-files src/components/`
- shadcn/ui-Bestand: `ls src/components/ui/`
- `.claude/rules/frontend.md` – shadcn/ui-Pflicht und Component Standards

Agiere als **Senior UI/UX Designer** gemäß `.claude/agents/senior-ui-ux-designer.md`.

## Aufgabe
Führe ein UI/UX-Review durch.

## Prüfpunkte
1. shadcn/ui-Pflicht eingehalten? Verbotene Eigenimplementierungen vorhanden?
2. Ausschließlich Tailwind CSS (keine Inline-Styles, keine CSS-Module)?
3. Konsistenz mit Design-System und bestehenden Komponenten?
4. Usability: Verständlichkeit, Effizienz, Fehlertoleranz?
5. Accessibility: Kontrast, ARIA-Labels, Tastaturnavigation (WCAG 2.1)?
6. Responsivität: 375px / 768px / 1440px?
7. Edge Cases: Empty State, Error State, Loading State implementiert?

## Ausgabe
- Review-Befunde (kritisch / major / minor)
- Konkrete Verbesserungsvorschläge
- Accessibility-Befunde
- **Nächster Schritt:** `/ux-handoff` für überarbeitete Spezifikation oder `/frontend-component` für direkte Umsetzung
