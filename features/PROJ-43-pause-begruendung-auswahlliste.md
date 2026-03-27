# PROJ-43: Pause-Begründung als Auswahlliste

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-28
**Herkunft:** Kunden-Session 28.03.2026, F-02 (Herr Brandt, Soest, P1)
**Prioritaet:** Niedrig

---

## 1. Ziel / Problem

Sachbearbeiter tippen bei jeder Verfahrenspause denselben Begründungstext ein. Die häufigsten Gründe sind immer dieselben (Nachforderung Bauherr, Stellungnahme TöB, Nachbarbeteiligung). Eine Auswahlliste mit "Sonstiges"-Freitext standardisiert die Eingabe und ermöglicht spätere Auswertungen.

## 2. Fachlicher Kontext & Stakeholder

- **P1 (Erfahrener SB, Soest):** "Die Gründe sind immer dieselben — Auswahlliste statt Freitext"
- **PROJ-37:** Frist-Pause (Deployed) — aktuell nur Freitext

## 3. Funktionale Anforderungen

- FA-1: Auswahlliste mit vorkonfigurierten Pause-Gründen
- FA-2: Option "Sonstiges" mit Freitext-Feld
- FA-3: Gründe-Liste konfigurierbar (nicht hardcoded)

## 4. User Stories & Akzeptanzkriterien

### US-1: Pause-Grund aus Liste wählen
Als Sachbearbeiter möchte ich den Pause-Grund aus einer vorkonfigurierten Liste wählen.
- AC-1: Select-Dropdown mit mindestens: "Nachforderung Bauherr", "Stellungnahme TöB ausstehend", "Nachbarbeteiligung läuft", "Sonstiges"
- AC-2: Bei "Sonstiges" erscheint ein Freitext-Feld (min. 3 Zeichen)
- AC-3: Gewählter Grund wird in `vorgang_pausen.begruendung` gespeichert

## 9. Abhaengigkeiten

- PROJ-37 (Frist-Pause): Basis-Feature

## 11. Scope / Nicht-Scope

**Scope:** Auswahlliste im Pause-Dialog, Freitext bei "Sonstiges"
**Nicht-Scope:** Mandanten-konfigurierbare Gründe-Liste (reicht als Konstante im Code)
