---
name: ux-handoff
description: Erstellt einen vollständigen, implementierungsreifen Design-Handoff für den Frontend Developer. Enthält Komponenten-Spezifikation, Tailwind-Klassen, alle States und Accessibility-Notizen. Aufruf mit /ux-handoff [PROJ-X]
---

Lies zuerst:
- UX-Konzept / Feature-Spec: `features/PROJ-X-*.md`
- shadcn/ui-Bestand: `ls src/components/ui/`
- Bestehende Komponenten: `git ls-files src/components/`
- `.claude/rules/frontend.md`

Agiere als **Senior UI/UX Designer** gemäß `.claude/agents/senior-ui-ux-designer.md`.
Ausgabe direkt verwendbar für **Senior Frontend Developer** gemäß `.claude/agents/senior-frontend-developer.md`.

## Aufgabe
Erstelle einen vollständigen Design-Handoff.

## Handoff-Inhalt
1. Prüfe shadcn/ui: `ls src/components/ui/` – Komponenten-Liste mit shadcn/ui-Zuordnung oder Custom-Begründung
2. Tailwind-Klassen je Komponente (vollständig, keine Platzhalter)
3. Responsive Breakpoints: 375px / 768px / 1440px
4. User Flow (Schritt-für-Schritt)
5. Alle States: Default / Hover / Active / Disabled / Loading / Error / Empty
6. ARIA-Labels und Keyboard-Navigation-Hinweise
7. Fehlende shadcn-Komponenten: `npx shadcn@latest add <n> --yes`

## Ausgabe
- Vollständige Handoff-Spezifikation
- shadcn/ui-Komponentenliste mit Installationshinweisen
- Tailwind-Snippets (vollständig)
- Accessibility-Notizen
- **Nächster Schritt:** `/frontend-component` für Implementierung
