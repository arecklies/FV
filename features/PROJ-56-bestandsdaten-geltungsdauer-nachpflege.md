# PROJ-56: Bestandsdaten Geltungsdauer-Nachpflege

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-27
**Herkunft:** Follow-up aus PROJ-48 Conditional Go (B-48-01)
**Typ:** Minor-Fix

---

## 1. Ziel / Problem

PROJ-48 berechnet `geltungsdauer_bis` automatisch beim Workflow-Uebergang zu "zustellung". Bereits abgeschlossene Vorgaenge (Bestandsdaten) haben diesen Workflow-Schritt aber bereits durchlaufen und besitzen kein `geltungsdauer_bis`. Ohne Nachpflege koennen fuer Bestandsvorgaenge keine Verlaengerungen beantragt werden.

## 2. Fachlicher Kontext & Stakeholder

- **Sachbearbeiter:** Muessen Verlaengerungen auch fuer aeltere Vorgaenge bearbeiten koennen
- **PROJ-48 AC-7:** "Bereits abgeschlossene Vorgaenge koennen geltungsdauer_bis manuell nachpflegen"

## 3. Funktionale Anforderungen

- FA-1: Manuelle Eingabe von `geltungsdauer_bis` auf abgeschlossenen Vorgaengen
- FA-2: Eingabe nur fuer Verfahrensarten mit Genehmigungscharakter (Kategorie `genehmigung`, `vorbescheid`)

## 4. User Stories & Akzeptanzkriterien

### US-1: Geltungsdauer manuell nachpflegen
Als Sachbearbeiter moechte ich fuer einen abgeschlossenen Vorgang das Geltungsdauer-Ende manuell setzen, damit ich auch fuer Bestandsvorgaenge Verlaengerungen bearbeiten kann.
- AC-1: Auf der Vorgangsdetailseite erscheint bei abgeschlossenen Vorgaengen ohne `geltungsdauer_bis` ein Hinweis "Geltungsdauer nicht gesetzt"
- AC-2: Button "Geltungsdauer nachpflegen" oeffnet Datumspicker
- AC-3: Nach Speichern ist die Verlaengerungsfunktion (PROJ-48) verfuegbar
- AC-4: Audit-Log: `geltungsdauer.manuell_gesetzt` mit altem/neuem Wert

## 5. Nicht-funktionale Anforderungen

- Ausgabe von `/req-nfr` wird hier eingefuegt.

## 6. Spezialisten-Trigger

- **Senior Frontend Developer:** Hinweis-Anzeige, Datumspicker-Dialog
- **Senior Backend Developer:** PATCH-Endpunkt, Audit-Log

## 7. Offene Fragen

- Keine.

## 8. Annahmen

- Bestehende API-Route `PATCH /api/vorgaenge/[id]` wird erweitert
- Kein Migrations-Script fuer Massennachpflege (manuell je Vorgang)

## 9. Abhaengigkeiten

- PROJ-48 (Verlaengerung Baugenehmigung) -- Deployed

## 10. Fachliche Risiken

| Risiko | Auswirkung | Gegenmassnahme |
|--------|-----------|----------------|
| Falsches Datum eingegeben | Verlaengerung faelschlicherweise moeglich/unmoeglich | Plausibilitaetspruefung (Datum muss in Vergangenheit oder naher Zukunft liegen) |

## 11. Scope / Nicht-Scope

**Scope:** Manuelles Setzen von geltungsdauer_bis auf Einzelvorgaengen
**Nicht-Scope:** Massen-Nachpflege (Batch-Update), automatische Berechnung fuer Bestandsdaten
