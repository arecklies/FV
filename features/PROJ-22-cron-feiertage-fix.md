# PROJ-22: Cron-Job Feiertags-Korrektheit und Batch-Optimierung

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-26
**Herkunft:** PROJ-4 Retro Action Item A-1 (kritisch)

---

## 1. Ziel / Problem

Der Cron-Job `aktualisiereAlleAmpelStatus()` berechnet Ampelstatus ohne Feiertage, weil `vorgang_fristen` kein `bundesland`-Feld hat. Bei kurzen Fristen (5 Werktage) kann die Ampel eine Stufe falsch liegen. Fuer ein System mit Rechtsrelevanz nicht akzeptabel. Zusaetzlich fuehrt der Cron-Job N+1 einzelne UPDATEs aus und hat einen harten `.limit(1000)`-Deckel.

## 2. Fachlicher Kontext & Stakeholder

- **Alle Stakeholder:** Erwarten korrekte Fristberechnung — Fristversaeumnisse haben rechtliche Konsequenzen
- **Architekt:** N+1-Pattern und fehlende Paginierung sind technische Schulden

## 3. Funktionale Anforderungen

- FA-1: `vorgang_fristen` erhaelt Spalte `bundesland text NOT NULL`
- FA-2: Bei Fristanlage wird `bundesland` aus dem Vorgang uebernommen
- FA-3: Cron-Job laedt Feiertage je Bundesland (gruppiert, nicht pro Frist)
- FA-4: Batch-UPDATE statt Einzel-Queries
- FA-5: Paginierter Durchlauf statt `.limit(1000)`-Deckel

## 4. User Stories & Akzeptanzkriterien

### US-1: Korrekte Ampelberechnung im Cron-Job
- AC-1: Ampelstatus beruecksichtigt Feiertage des jeweiligen Bundeslandes
- AC-2: Bestehende Fristen werden per Backfill-Migration mit `bundesland` aus `vorgaenge` befuellt
- AC-3: Kein einzelnes UPDATE pro Frist — Batch-Verarbeitung
- AC-4: Bei > 1000 aktiven Fristen werden alle verarbeitet (Paginierung)

## 5. Nicht-funktionale Anforderungen

- NFR-1: Cron-Job ist idempotent (sicheres Doppelt-Laufen)
- NFR-2: Migration ist Zero-Downtime (ADD COLUMN + Backfill)

## 6. Spezialisten-Trigger

- **Database Architect:** Migration (neue Spalte + Backfill)
- **Senior Backend Developer:** Cron-Job Refactoring

## 7. Offene Fragen

Keine.

## 8. Annahmen

- `vorgaenge.bundesland` ist fuer alle bestehenden Vorgaenge befuellt

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-4 (Fristmanagement) | Voraussetzung |

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Backfill-Migration bei vielen Fristen langsam | Niedrig | Lock-Risiko | Batch-UPDATE in Chunks |

## 11. Scope / Nicht-Scope

**Scope:** bundesland-Feld, Backfill, Cron-Fix, Batch-Update, Paginierung
**Nicht-Scope:** Aenderung der Ampellogik selbst, Frontend-Aenderungen
