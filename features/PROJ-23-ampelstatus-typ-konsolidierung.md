# PROJ-23: AmpelStatus Typ-Konsolidierung

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-26
**Herkunft:** PROJ-4 Retro Action Item A-3 (minor)

---

## 1. Ziel / Problem

`AmpelStatus` ist doppelt definiert: in `src/lib/services/fristen/types.ts` (Zeile 12) und in `src/components/fristen/ampel-badge.tsx` (Zeile 20). Verstoesst gegen Single Source of Truth (`frontend.md`). Erzwingt unnoetige `as AmpelStatus`-Casts im Frontend.

## 2. Fachlicher Kontext & Stakeholder

- **Frontend Developer:** Typ-Duplikat erzeugt Wartungsrisiko

## 3. Funktionale Anforderungen

- FA-1: `AmpelStatus` wird ausschliesslich aus `types.ts` exportiert
- FA-2: `ampel-badge.tsx` importiert den Typ statt ihn lokal zu definieren
- FA-3: Alle `as AmpelStatus`-Casts in `fristen-panel.tsx` und `page.tsx` entfallen

## 4. User Stories & Akzeptanzkriterien

### US-1: Single Source of Truth fuer AmpelStatus
- AC-1: Nur eine Definition von `AmpelStatus` im gesamten Projekt
- AC-2: Keine `as AmpelStatus`-Casts in Frontend-Komponenten
- AC-3: `npx tsc --noEmit` fehlerfrei

## 5. Nicht-funktionale Anforderungen

Keine (reines Refactoring).

## 6. Spezialisten-Trigger

- **Senior Frontend Developer:** Typ-Import aendern

## 7. Offene Fragen

Keine.

## 8. Annahmen

Keine.

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-4 (Fristmanagement) | Voraussetzung |

## 10. Fachliche Risiken

Keine.

## 11. Scope / Nicht-Scope

**Scope:** Typ-Duplikat entfernen, Imports anpassen, Casts entfernen
**Nicht-Scope:** Aenderung der Ampellogik oder des Designs
