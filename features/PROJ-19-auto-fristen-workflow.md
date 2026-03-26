# PROJ-19: Auto-Fristen bei Workflow-Schritt-Wechsel

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-26
**Herkunft:** PROJ-4 US-1 AC-4 (QS-Review: als separates Item ausgelagert)

---

## 1. Ziel / Problem

Bei einem Workflow-Schritt-Wechsel (z.B. Uebergang zu "Beteiligung") soll die schritt-spezifische Frist automatisch aus `config_fristen` gesetzt werden. Aktuell muessen Sachbearbeiter Fristen manuell anlegen — das ist fehleranfaellig und widerspricht dem Automatisierungsversprechen von PROJ-4.

## 2. Fachlicher Kontext & Stakeholder

- **P1 (Erfahrener SB):** Erwartet, dass gesetzliche Fristen bei Schritt-Wechsel automatisch greifen
- **P2 (Einsteiger):** Kennt die Fristen nicht auswendig — Automatik verhindert Versaeumnisse
- **ADR-011:** Workflow-Schritte haben ein optionales `frist`-Attribut (z.B. `"frist": "4_wochen"`)
- **ADR-006:** `config_fristen` liefert die konkreten Fristwerte je BL + Verfahrensart

## 3. Funktionale Anforderungen

- FA-1: Bei `executeWorkflowAktion` wird geprueft, ob der Ziel-Schritt ein `frist`-Attribut hat
- FA-2: Falls ja, wird die passende Frist aus `config_fristen` geladen (BL + Verfahrensart + Typ)
- FA-3: Eine neue `vorgang_fristen`-Zeile wird automatisch angelegt (FristService.createFrist)
- FA-4: Falls keine passende Konfiguration existiert, wird ein Warn-Log geschrieben (kein Abbruch)

## 4. User Stories & Akzeptanzkriterien

### US-1: Automatische Frist bei Schritt-Wechsel
Als Sachbearbeiter moechte ich, dass bei einem Workflow-Schritt-Wechsel die zugehoerige Frist automatisch gesetzt wird.
- AC-1: Bei Uebergang zu einem Schritt mit `frist`-Attribut wird eine Frist in `vorgang_fristen` angelegt
- AC-2: Fristtyp, Werktage und Bezeichnung stammen aus `config_fristen` (nicht hardcoded)
- AC-3: Ampelstatus wird sofort berechnet und gespeichert
- AC-4: Im Audit-Trail wird die automatische Fristsetzung protokolliert
- AC-5: Bei fehlendem config_fristen-Eintrag: kein Fehler, nur Warn-Log

## 5. Nicht-funktionale Anforderungen

- NFR-1: Kein zusaetzlicher API-Call aus dem Frontend — Frist wird serverseitig beim Workflow-Schritt-Wechsel gesetzt
- NFR-2: Keine Aenderung am Workflow-API-Kontrakt (Response darf erweitert, nicht gebrochen werden)

## 6. Spezialisten-Trigger

- **Senior Backend Developer:** WorkflowService + FristService Integration

## 7. Offene Fragen

Keine.

## 8. Annahmen

- `config_fristen` enthaelt fuer relevante Verfahrensarten und Bundeslaender die schritt-spezifischen Fristen
- Das `frist`-Attribut in der Workflow-Definition ist der Lookup-Key fuer `config_fristen.typ`

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-4 (Fristmanagement) | Voraussetzung (FristService, vorgang_fristen-Tabelle) |
| PROJ-3 (Vorgangsverwaltung) | Voraussetzung (WorkflowService, executeWorkflowAktion) |
| ADR-011 (Workflow Engine) | frist-Attribut auf Workflow-Schritten |
| ADR-006 (Rechtskonfiguration) | config_fristen je BL |

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| config_fristen nicht befuellt fuer alle BL/Verfahrensarten | Mittel | Keine automatische Frist | Warn-Log + manuelle Fristanlage als Fallback |

## 11. Scope / Nicht-Scope

**Scope:**
- Integration WorkflowService -> FristService bei Schritt-Wechsel
- Lookup in config_fristen

**Nicht-Scope:**
- Aenderung der Workflow-Definition (JSON-Schema bleibt)
- Frontend-Aenderungen (Frist wird automatisch im bestehenden Fristen-Tab sichtbar)
- Befuellung von config_fristen (separate Aufgabe)
