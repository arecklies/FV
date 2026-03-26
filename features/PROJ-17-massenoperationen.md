# PROJ-17: Massenoperationen Vorgangsliste

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-26
**Herkunft:** Extrahiert aus PROJ-3 US-6 (Retro Action Item A-8)

---

## 1. Ziel / Problem

Sachbearbeiter bearbeiten regelmaessig mehrere Vorgaenge gleichzeitig (z.B. Status aendern nach Stellungnahme-Eingang, Zuweisen bei Vertretung). Ohne Massenoperationen muss jeder Vorgang einzeln geoeffnet werden. Umfrage: 64 Votes, Rang 3 der Freitext-Anforderungen.

## 2. Fachlicher Kontext & Stakeholder

- **P1 (Sachbearbeiter):** Mehrere Vorgaenge gleichzeitig bearbeiten spart Zeit
- **P3 (Referatsleiter):** Sammelzuweisung bei Personalwechsel/Vertretung

## 3. Funktionale Anforderungen

- FA-1: Checkboxen in der Vorgangsliste fuer Mehrfachauswahl
- FA-2: Sammelaktionen: Status aendern, Zuweisen, Frist verschieben
- FA-3: Bestaetigungsdialog vor Ausfuehrung
- FA-4: Ergebnisanzeige (erfolgreich/fehlgeschlagen je Vorgang)

## 4. User Stories & Akzeptanzkriterien

### US-1: Massenoperationen auf Vorgangsliste
Als Sachbearbeiter moechte ich mehrere Vorgaenge gleichzeitig bearbeiten.
- AC-1: Checkboxen in Vorgangsliste fuer Mehrfachauswahl
- AC-2: Sammelaktionen: Status aendern, Zuweisen, Frist verschieben
- AC-3: Bestaetigung vor Ausfuehrung (z.B. "3 Vorgaenge zuweisen an Max Mustermann?")
- AC-4: Ergebnisanzeige: Wie viele erfolgreich, wie viele fehlgeschlagen

## 5. Nicht-funktionale Anforderungen

- NFR-1: Batch-Verarbeitung serverseitig (nicht N einzelne API-Calls)
- NFR-2: Mandantentrennung (RLS) bei Batch-Operationen

## 6. Spezialisten-Trigger

- **Backend Developer:** Batch-API-Endpoint
- **Frontend Developer:** Checkbox-Auswahl + Aktions-Toolbar
- **QS Engineer:** Batch-Konsistenz-Tests

## 7. Offene Fragen

(keine)

## 8. Annahmen

- Batch-Endpoint akzeptiert Array von Vorgang-IDs
- Maximale Batch-Groesse: 100 Vorgaenge

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-3 (Vorgangsverwaltung) | Voraussetzung (Vorgangsliste existiert) |

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Teilweise fehlgeschlagene Batch-Operation | Mittel | Inkonsistenz | Ergebnisanzeige pro Vorgang, kein All-or-Nothing |

## 11. Scope / Nicht-Scope

**Scope:** Checkboxen + Sammelaktionen (Status, Zuweisen, Frist) in bestehender Vorgangsliste
**Nicht-Scope:** Bulk-Import, Bulk-Export, Massenloeschung
