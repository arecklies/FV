---
name: frontend-component
description: Implementiert neue React-Komponenten nach frontend.md. shadcn/ui-Pflicht, Tailwind CSS, TypeScript, alle States, responsiv. Commit-Format: type(PROJ-X): description. Aufruf mit /frontend-component [PROJ-X]
---

## Voraussetzung (STOPP bei Verletzung)
1. Prüfe `features/INDEX.md`: Existiert ein Eintrag für die angeforderte PROJ-ID?
2. Prüfe `features/PROJ-X-*.md`: Existiert eine Feature-Spec mit mindestens 1 User Story?
Wenn beides nicht erfüllt: **STOPP. Keinen Code schreiben.** Nutzer informieren:
"Feature hat keine Spec / keinen INDEX-Eintrag. Nächster Schritt: `/po-backlog`."

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
4. **Fachliche Konstanten VOR Komponenten anlegen (Retro A-6):** Label-Mappings, Status-Definitionen, Konfigurationswerte in `src/lib/utils/` extrahieren BEVOR Komponenten erstellt werden. Keine hardcoded Maps in Komponenten-Dateien.
5. Implementiere Komponenten (TSX, Tailwind CSS ausschließlich, TypeScript-Interfaces für alle Props)
6. Alle States implementieren: Default / Hover / Active / Disabled / Loading / Error / Empty
7. Responsivität sicherstellen: 375px / 768px / 1440px
8. ARIA-Labels und Accessibility-Attribute hinzufügen (BITV 2.0 / EN 301 549)
9. Akzeptanzkriterien-Check: Jedes AC aus der Feature-Spec einzeln prüfen. Fehlende ACs sofort implementieren.
10. Testcode schreiben gemäß `.claude/rules/testing.md`:
    - Testabdeckung ≥ 80 % für neue Dateien sicherstellen (Qualitätsgate)
11. Hole Nutzer-Freigabe bei Auth-Flow-Änderungen ein (Human-in-the-Loop)
12. Vor dem Commit: Tote Imports prüfen. Ungenutzte Imports entfernen.
13. Zeichensatz-Prüfung (Pflicht bei deutschen Texten):
    - `grep -rn "oe\|ue\|ae" <neue-dateien>` und Treffer gegen Kontext prüfen
14. Build-Verifikation: `npm run build` ausführen. Alle Fehler vor dem Commit beheben.
15. Commit-Format: `feat(PROJ-X): <beschreibung>`

## Ausgabe
- Implementierte Komponenten (Code)
- shadcn/ui-Verwendung dokumentiert
- State-Übersicht
- **AC-Prueftabelle (Pflicht):**

| AC | Implementiert | Stelle (Datei:Zeile) | Anmerkung |
|---|---|---|---|
| US-X AC-Y | ✅ / ❌ (ausgelassen) | [datei.tsx:42] | [Begruendung bei Auslassung] |

- **Nächster Schritt:** Bei >3 neuen/geänderten Dateien: `/frontend-review` vor QS. Sonst: `/frontend-integrate` für API-Anbindung oder `/qs-review` für Verifikation
