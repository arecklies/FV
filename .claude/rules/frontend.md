# Frontend Rules

> Diese Regeln gelten primär für den **Senior Frontend Developer** (`.claude/agents/senior-frontend-developer.md`).
> Der **Senior UI/UX Designer** (`.claude/agents/senior-ui-ux-designer.md`) beachtet den Abschnitt „shadcn/ui First" bei Design-Handoffs und Reviews.
> Der **Senior Security Engineer** (`.claude/agents/senior-security-engineer.md`) prüft den Abschnitt „Auth Best Practices" im Audit-Kontext.

## shadcn/ui First (PFLICHT)
- Vor JEDER UI-Komponente prüfen, ob shadcn/ui sie bereits enthält: `ls src/components/ui/`
- NIEMALS eigene Implementierungen für diese Komponenten erstellen:
  `Button`, `Input`, `Select`, `Checkbox`, `Switch`, `Dialog`, `Modal`, `Alert`, `Toast`,
  `Table`, `Tabs`, `Card`, `Badge`, `Dropdown`, `Popover`, `Tooltip`,
  `Navigation`, `Sidebar`, `Breadcrumb`
- Fehlende shadcn-Komponente installieren: `npx shadcn@latest add <name> --yes`
- Eigene Komponenten nur für fachspezifische Kompositionen, die intern shadcn-Primitives verwenden

## Import Pattern
```tsx
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
```

## Component Standards
- Ausschließlich **Tailwind CSS** verwenden (keine Inline-Styles, keine CSS-Module)
- Alle Komponenten müssen responsiv sein: mobile 375px, tablet 768px, desktop 1440px
- Loading States, Error States und Empty States immer implementieren
- Barrierefreiheit: **WCAG 2.2 Level AA** ist verbindlicher Standard (entspricht BITV 2.0 / EN 301 549)
- Semantisches HTML und ARIA-Labels für alle interaktiven Elemente
- WCAG 2.2 Neuerungen beachten:
  - **2.4.11 Focus Not Obscured**: Fokussiertes Element darf nicht von Sticky-Headern/Footern verdeckt werden
  - **2.5.8 Target Size Minimum**: Interaktive Elemente mindestens 24×24 CSS-Pixel
  - **3.2.6 Consistent Help**: Hilfe-Texte und Disclaimer konsistent an gleicher Stelle platzieren
  - **3.3.7 Redundant Entry**: Bereits eingegebene Daten nicht erneut abfragen
- Komponenten klein und fokussiert halten (Single Responsibility)

## Querschnitts-NFRs (Pflicht fuer alle Features ab Phase 1)
> Quelle: Online-Umfrage-Auswertung (`docs/umfrage-auswertung.md`) -- 5 der Top-10 Freitext-Anforderungen sind UX-Qualitaetsmerkmale
- **Auto-Save**: Formulareingaben automatisch zwischenspeichern (localStorage/sessionStorage). Bei Verbindungsabbruch oder versehentlichem Tab-Schliessen duerfen keine Eingaben verloren gehen. Visueller Indikator: "Gespeichert" vs. "Nicht gespeichert". (Umfrage: 61 Votes, Rang 4)
- **Tastaturnavigation fuer Power-User**: Ueber WCAG-Pflicht hinaus: `Ctrl+K` fuer globale Suche (Command-Palette), `Ctrl+N` neuer Vorgang, `Ctrl+S` speichern. Vorgangsliste navigierbar mit Pfeiltasten. (Umfrage: 72 Votes, Rang 2)
- **Massenoperationen**: Checkboxen in Listen + Sammelaktion (Status aendern, Zuweisen, Frist verschieben). Standardpattern fuer alle Listendarstellungen. (Umfrage: 64 Votes, Rang 3)

## Print-CSS (bei druckbaren Seiten)
- Bei druckbaren Seiten (Reports, Zusammenfassungen, Checklisten): Print-CSS via `@media print` in `globals.css` sicherstellen
- Hintergrundfarben: `-webkit-print-color-adjust: exact; print-color-adjust: exact`
- Navigation, Buttons und interaktive Elemente ausblenden (`print:hidden`)
- Seitenumbrüche beachten (`break-inside: avoid` für zusammengehörige Blöcke)

## Type Management
- TypeScript-Interfaces haben genau EINE Quelldatei (Single Source of Truth)
- Fachliche Domain-Types: `src/lib/regelwerk/types.ts`
- API-Types: neben der API-Route oder in `src/lib/api/`
- Vor Erstellung eines neuen Interfaces: `grep -r "interface <Name>" src/` ausführen
- Re-Exports (`export type { X } from "..."`) sind erlaubt, Duplikate nicht

## Logik-Extraktion (Pflicht)
- Reine Logik (Sortierung, Filterung, Formatierung, Berechnung) NICHT in Page- oder Komponenten-Dateien implementieren
- Solche Funktionen in eigene Module unter `src/lib/` oder `src/lib/utils/` extrahieren
- Faustregel: Wenn eine Funktion keine React-Hooks oder JSX benötigt, gehört sie nicht in eine TSX-Datei

## Zeichensatz in Quellcode
- Deutsche Umlaute (ä, ö, ü, ß) und Sonderzeichen (§, ², ³) direkt als UTF-8-Zeichen schreiben — KEINE ASCII-Ersetzungen (ae/oe/ue/ss) in nutzersichtbaren Strings
- Typographische Anführungszeichen vermeiden: statt \u201E \u201C immer " " verwenden
- Gedankenstrich (\u2013, U+2013) durch Bindestrich-Minus (-) oder Unicode-Escape ersetzen
- Im Zweifel: `npm run build` nach jeder neuen Datei mit deutschen Texten ausführen
- TypeScript-Interfaces für alle Props
- Vor neuen Komponenten prüfen: `git ls-files src/components/`

## Bundesland-Routing-Konsistenz
- Bei Änderungen an `src/lib/regelwerk/loader.ts` (neue BL, verfuegbar-Flag) IMMER auch prüfen:
  - `src/lib/regelwerk/labels.ts` → `BUNDESLAND_AKTIV` aktualisieren
  - `src/app/page.tsx` → Auswahlliste und Hinweistexte aktualisieren
- Ein neues BL ist erst dann "live", wenn es in ALLEN drei Dateien aktiv ist

## Auth Best Practices (Supabase)
- `window.location.href` für Post-Login-Redirect verwenden (nicht `router.push`)
- `data.session` immer prüfen, bevor weitergeleitet wird
- Loading-State in allen Code-Pfaden zurücksetzen (success, error, finally)
- Änderungen am Auth-Flow erfordern explizite Nutzer-Freigabe (Human-in-the-Loop)

## Sortier-Konventionen (Frist-Ampel)
- Die Ampel-Prioritaet ist numerisch invertiert: `dunkelrot=0` (dringendst) bis `gruen=4` (sicher), `null=5` (keine Frist)
- "Dringendste zuerst" = **aufsteigende** Sortierung (`asc`, pa - pb) — dunkelrot(0) kommt vor gruen(4)
- "Im Zeitplan zuerst" = **absteigende** Sortierung (`desc`, pb - pa) — gruen(4) kommt vor dunkelrot(0)
- Bei neuen Schnellfiltern oder Sortier-Buttons: Richtung gegen Seed-Daten verifizieren, nicht raten (Retro R-3 aus PROJ-50)

## Lokales Testen (Dev-Modus)
- Fuer visuelle Tests ohne Auth: temporaere Seite unter `src/app/test-<feature>/page.tsx` erstellen
- Seite mit `"use client"` und ohne AuthGuard/AuthProvider
- Testdaten direkt als Props oder Konstanten
- Seite nach erfolgreichem Test loeschen (nicht committen)
- Alternativ: Login via Browser-Konsole mit dem App-eigenen Supabase-Client (Storage-Key muss `sb-<project-ref>-auth-token` sein)
