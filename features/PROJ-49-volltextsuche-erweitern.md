# PROJ-49: Volltextsuche über mehrere Spalten erweitern

**Status:** In Progress | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-27
**Herkunft:** Kunden-Demo-Validierung 27.03.2026 (große Kommune braucht funktionierende Suche)
**Priorität:** Hoch (Pilotblocker große Kommunen)
**Typ:** Quick-Fix

---

## 1. Ziel / Problem

Die Volltextsuche in der Vorgangsliste durchsucht aktuell nur das Aktenzeichen (PostgreSQL tsvector). In großen Kommunen mit hunderten Vorgängen müssen Sachbearbeiter nach Bauherr-Name, Grundstücksadresse und Bezeichnung suchen können.

## 4. User Stories & Akzeptanzkriterien

### US-1: Suche über mehrere Felder

- AC-1: Suche nach Bauherr-Name liefert passende Vorgänge (z.B. "Müller" findet "Müller, Hans")
- AC-2: Suche nach Adresse liefert passende Vorgänge (z.B. "Berliner" findet "Berliner Str. 45")
- AC-3: Suche nach Bezeichnung liefert passende Vorgänge (z.B. "Nutzungsänderung" findet "Nutzungsänderung Laden→Praxis")
- AC-4: Suche nach Aktenzeichen funktioniert weiterhin (keine Regression)
- AC-5: Suche ist case-insensitive

## 11. Scope / Nicht-Scope

**Scope:** Query in `listVorgaenge()` von `textSearch` auf `or(ilike)` über aktenzeichen, bauherr_name, grundstueck_adresse, bezeichnung umstellen.
**Nicht-Scope:** GIN-Trigram-Index (erst bei >50.000 Vorgängen nötig), Flurstück-Suche, Suche nach Workflow-Schritt per Freitext.

## 9. Abhängigkeiten

- PROJ-3 Vorgangsverwaltung (Deployed)
