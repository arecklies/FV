---
name: frontend-component
description: Implementiert neue React-Komponenten nach frontend.md. shadcn/ui-Pflicht, Tailwind CSS, TypeScript, alle States, responsiv. Commit-Format: type(PROJ-X): description. Aufruf mit /frontend-component [PROJ-X]
---

Lies zuerst:
- UX-Handoff / Feature-Spec: `features/PROJ-X-*.md`
- shadcn/ui-Bestand: `ls src/components/ui/`
- Bestehende Komponenten: `git ls-files src/components/`
- `.claude/rules/frontend.md`

Agiere als **Senior Frontend Developer** gemäß `.claude/agents/senior-frontend-developer.md`.

## Aufgabe
Implementiere neue UI-Komponenten für ein Feature.

## Schritte
0. Prüfe ob `/arch-review` vor Implementierung sinnvoll ist:
   - Neue Seiten/Routen → ja (Routing-Architektur, Auth-Layout)
   - Neue Komponente in bestehender Seite → nein
   - Neue API-Anbindung → ja (Server vs. Client Component)
1. shadcn/ui prüfen: `ls src/components/ui/` – Pflicht vor jeder neuen Komponente
2. Bestehende Komponenten prüfen: `git ls-files src/components/`
3. Fehlende shadcn-Komponenten installieren: `npx shadcn@latest add <n> --yes` → Nutzer informieren
4. Implementiere Komponenten (TSX, Tailwind CSS ausschließlich, TypeScript-Interfaces für alle Props)
5. Alle States implementieren: Default / Hover / Active / Disabled / Loading / Error / Empty
6. Responsivität sicherstellen: 375px / 768px / 1440px
7. ARIA-Labels und Accessibility-Attribute hinzufügen (BITV 2.0 / EN 301 549)
8. Testcode anpassen gemäß `.claude/rules/testing.md`
9. Hole Nutzer-Freigabe bei Auth-Flow-Änderungen ein (Human-in-the-Loop)
10. Commit-Format: `feat(PROJ-X): <beschreibung>`

## Ausgabe
- Implementierte Komponenten (Code)
- shadcn/ui-Verwendung dokumentiert
- State-Übersicht
- **Nächster Schritt:** `/frontend-integrate` für API-Anbindung oder `/qs-review` für Verifikation
