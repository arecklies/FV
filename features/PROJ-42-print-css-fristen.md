# PROJ-42: Print-CSS Frist-Dashboard und Vorgangsliste

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-28
**Herkunft:** Kunden-Session 28.03.2026, F-04 (Herr Özdemir, Dortmund, P3)
**Prioritaet:** Mittel

---

## 1. Ziel / Problem

Referatsleiter drucken die Fristübersicht für die montägliche Fristbesprechung. Aktuell bricht die Tabelle mitten in Zeilen um und Ampelfarben gehen beim Druck verloren. Print-CSS ist in frontend.md als Pflicht definiert, wurde aber für Dashboard-Seiten nicht implementiert.

## 2. Fachlicher Kontext & Stakeholder

- **P3 (Referatsleiter, Dortmund):** "Strg+P — Seitenumbruch mitten in der Tabelle, Ampelfarben weg"
- **frontend.md:** Print-CSS Abschnitt definiert `-webkit-print-color-adjust: exact`, `break-inside: avoid`, `print:hidden`

## 3. Funktionale Anforderungen

- FA-1: Vorgangsliste druckbar mit korrekten Seitenumbrüchen
- FA-2: Frist-Dashboard druckbar mit Ampelfarben
- FA-3: Navigation, Buttons und interaktive Elemente im Druck ausblenden

## 4. User Stories & Akzeptanzkriterien

### US-1: Fristübersicht drucken
Als Referatsleiter möchte ich die Fristübersicht ausdrucken, damit ich sie in der Fristbesprechung verwenden kann.
- AC-1: `@media print` Regeln in `globals.css` für Tabellenzeilen (`break-inside: avoid`)
- AC-2: Ampelfarben im Druck sichtbar (`print-color-adjust: exact`)
- AC-3: Navigation, Filter, Buttons ausgeblendet (`print:hidden`)
- AC-4: Seitentitel mit Datum und Mandantenname

## 9. Abhaengigkeiten

- PROJ-20 (Frist-Ampel Vorgangsliste)
- PROJ-21 (Frist-Dashboard)

## 11. Scope / Nicht-Scope

**Scope:** Print-CSS für Vorgangsliste und Frist-Dashboard
**Nicht-Scope:** PDF-Export-Button (eigenes Feature), Druckvorschau
