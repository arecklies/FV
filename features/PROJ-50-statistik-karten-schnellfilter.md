# PROJ-50: Statistik-Karten als Schnellfilter

**Status:** Deployed | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-27
**Herkunft:** Kunden-Demo 27.03.2026 (Karten haben Hover-Effekt, aber keine Klick-Aktion)
**Typ:** Quick-Fix

---

## 1. Ziel / Problem

Die Statistik-Karten auf der Vorgangsliste haben durch PROJ-31 einen Hover-Effekt bekommen, reagieren aber nicht auf Klick. Das weckt die Erwartung eines Schnellfilters, der nicht funktioniert.

## 4. User Stories & Akzeptanzkriterien

### US-1: Klick auf Statistik-Karte sortiert Vorgangsliste

- AC-1: Klick auf "Vorgänge gesamt" setzt Standard-Sortierung (Eingangsdatum, neueste zuerst)
- AC-2: Klick auf "Fristgefährdet" sortiert nach Friststatus (dringendste zuerst)
- AC-3: Klick auf "Überfällig" sortiert nach Friststatus (dringendste zuerst)
- AC-4: Klick auf "Im Zeitplan" sortiert nach Friststatus (im Zeitplan zuerst)
- AC-5: Karten sind per Tastatur erreichbar (Tab + Enter/Space)

## 11. Scope / Nicht-Scope

**Scope:** onClick + onKeyDown + cursor-pointer + role="button" + aria-label auf 4 Statistik-Karten
**Nicht-Scope:** Echtes Filtern (nur anzeigen von gelb/rot/grün) — Sortierung ist ausreichend

## 9. Abhängigkeiten

- PROJ-47 (Statistik-Karten, Deployed), PROJ-31 (Visuelles Redesign, Deployed)
