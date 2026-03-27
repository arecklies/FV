# PROJ-32: Kundenrückmeldungen (Sammelitem)

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-27

---

## 1. Ziel / Problem

Sammelitem für kleinere Korrekturen und Verbesserungen, die während der Kunden-Demo oder aus direktem Nutzerfeedback entstehen. Jede Korrektur ist für sich ein Quick-Fix.

## 4. User Stories & Akzeptanzkriterien

### US-1: Umlaute in allen nutzersichtbaren Strings
- AC-1: Nav-Label "Vorgaenge" wird zu "Vorgänge"
- AC-2: Placeholder "name@behoerde.de" wird zu "name@behörde.de" (Login, Reset, Admin)
- AC-3: Fehlermeldung "pruefen" wird zu "prüfen" (Login)
- AC-4: URL-Pfade, Variablennamen und Tab-Values bleiben ASCII (technische Bezeichner)

## 9. Abhaengigkeiten

Keine.

## 11. Scope / Nicht-Scope

**Scope:** Nutzersichtbare Strings mit ASCII-Ersetzungen korrigieren
**Nicht-Scope:** Code-Kommentare, Variablennamen, URL-Pfade (bleiben ASCII)
