# PROJ-61: Dark/Light Mode Toggle

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-29
**Herkunft:** Nutzertest Afterwork 14.05.2026, Jan Richter (IT-Quereinsteiger Leipzig): "Wenn schon modern, dann richtig"
**Prioritaet:** Niedrig (Nice-to-have, kein Pilotblocker)

---

## 1. Ziel / Problem

Nutzer koennen nicht zwischen hellem und dunklem Erscheinungsbild wechseln. Power-User und IT-affine Sachbearbeiter erwarten einen Dark Mode. Die technische Grundlage ist bereits vorhanden: Tailwind CSS mit `darkMode: ["class"]` und shadcn/ui Komponenten mit eingebauten Dark-Mode-Varianten.

## 2. Fachlicher Kontext & Stakeholder

- **IT-Quereinsteiger (Nutzertest Tag 2):** "Wenn schon modern, dann richtig"
- **Power-User:** Lange Bildschirmarbeit, dunkles Theme reduziert Augenbelastung
- **Bestandskunden:** Kein aktiver Wunsch, aber erwartet bei moderner Webanwendung

## 3. Funktionale Anforderungen

- FA-1: Toggle zwischen Light, Dark und System-Praeferenz
- FA-2: Praeferenz in localStorage persistiert
- FA-3: Bei "System" folgt die App der OS-Einstellung (prefers-color-scheme)

## 4. User Stories & Akzeptanzkriterien

### US-1: Zwischen Light und Dark Mode wechseln
Als Nutzer moechte ich zwischen hellem und dunklem Erscheinungsbild wechseln koennen.
- AC-1: Toggle im Header (Sonnen-/Mond-Icon) mit drei Optionen: Light, Dark, System
- AC-2: Wechsel erfolgt sofort ohne Seiten-Reload
- AC-3: Praeferenz wird in `localStorage` persistiert (Key: `theme`)
- AC-4: Bei "System" folgt die App `prefers-color-scheme`
- AC-5: Alle Seiten und Komponenten sind in beiden Modi lesbar (kein weisser Text auf weissem Grund)
- AC-6: Print-CSS ist immer Light Mode (unabhaengig von Theme-Wahl)

## 5. Nicht-funktionale Anforderungen

- Ausgabe von `/req-nfr` wird hier eingefuegt.

## 6. Spezialisten-Trigger

- **Senior Frontend Developer:** ThemeProvider (next-themes), Toggle-Komponente

## 7. Offene Fragen

- Keine. Technischer Ansatz ist klar (next-themes + shadcn/ui).

## 8. Annahmen

- `next-themes` als Provider (de-facto Standard fuer Next.js Dark Mode)
- Tailwind `darkMode: ["class"]` ist bereits konfiguriert
- shadcn/ui Komponenten unterstuetzen Dark Mode nativ (CSS-Variablen in globals.css)
- Kein Backend-Bezug, rein Frontend

## 9. Abhaengigkeiten

- Keine technischen Abhaengigkeiten
- Neue Dependency: `next-themes` (npm install)

## 10. Fachliche Risiken

| Risiko | Auswirkung | Gegenmassnahme |
|--------|-----------|----------------|
| Einzelne Komponenten haben fehlende Dark-Styles | Unlesbarer Text | Visueller Check aller Seiten in Dark Mode |

## 11. Scope / Nicht-Scope

**Scope:** ThemeProvider, Toggle (3 Modi), localStorage-Persistenz, Print immer Light
**Nicht-Scope:** Benutzerdefinierte Farbschemata, Mandanten-spezifisches Branding, High-Contrast Mode
