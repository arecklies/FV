---
name: ux-concept
description: Entwickelt UI/UX-Konzepte für neue Features. Erstellt Layout-Struktur, Komponenten-Hierarchie, User Flow und Design-Spezifikation für den Frontend Developer. Aufruf mit /ux-concept [PROJ-X]
---

Lies zuerst:
- User Stories und Feature-Spec: `features/PROJ-X-*.md`
- shadcn/ui-Bestand: `ls src/components/ui/`
- Bestehende Komponenten: `git ls-files src/components/`
- `.claude/rules/frontend.md` – shadcn/ui-Pflicht und Component Standards

Agiere als **Senior UI/UX Designer** gemäß `.claude/agents/senior-ui-ux-designer.md`.

## Aufgabe
Entwickle ein vollständiges UI/UX-Konzept für ein Feature.

## Schritte
1. Prüfe shadcn/ui-Verfügbarkeit: `ls src/components/ui/` – verbotene Eigenimplementierungen identifizieren
2. Analysiere User Stories und Nutzerbedürfnisse
3. Entwirf Layout-Struktur (Grid, Komponenten-Hierarchie nach Atomic Design)
4. Beschreibe User Flow (Interaktionsschritte)
5. Spezifiziere Visuals (Farben, Tokens, Tailwind-Klassen)
6. Dokumentiere Accessibility-Anforderungen (BITV 2.0 / EN 301 549, ARIA-Labels)
7. Berücksichtige Edge Cases (Empty State, Error State, Loading State)
8. Responsivität: 375px / 768px / 1440px

## Ausgabe
- Design-Konzept
- Komponenten-Hierarchie (mit shadcn/ui-Zuordnung)
- User Flow
- Tailwind-Snippets / Design-Tokens
- Accessibility-Check
- **Nächster Schritt:** `/ux-handoff` für Frontend-Übergabe
