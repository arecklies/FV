# PROJ-40: Adress-/Strassenfilter Vorgangsliste

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-27
**Herkunft:** Kunden-Session 27.03.2026, F-06 (Frau Kemper, Soest, P3)
**Prioritaet:** Niedrig

---

## 1. Ziel / Problem

Behoerden haben Gebietsaufteilung nach Strassenzuegen. Referatsleiter und Sachbearbeiter muessen Vorgaenge nach Strasse/Gebiet filtern koennen, um ihren Zustaendigkeitsbereich zu ueberblicken. Aktuell muss jeder Vorgang einzeln geoeffnet werden.

## 2. Fachlicher Kontext & Stakeholder

- **P3 (Referatsleiterin, Soest):** "Wir haben Gebietsaufteilung nach Strassenzuegen"
- **P1 (Sachbearbeiter):** Will Vorgaenge in "seinem" Gebiet schnell finden
- **PROJ-3:** Vorgangsverwaltung — Vorgang hat bereits Adressfelder (Strasse, PLZ, Ort)

## 3. Funktionale Anforderungen

- FA-1: Vorgangsliste um Filter "Strasse" erweitern (Textsuche, Teilstring)
- FA-2: Vorgangsliste um Filter "PLZ" erweitern (exakt)
- FA-3: Vorgangsliste um Filter "Ort/Ortsteil" erweitern (Textsuche)
- FA-4: Filter kombinierbar mit bestehenden Filtern (Status, Verfahrensart, Sachbearbeiter)

## 4. User Stories & Akzeptanzkriterien

### US-1: Vorgaenge nach Strasse filtern
Als Referatsleiterin moechte ich die Vorgangsliste nach Strasse filtern, damit ich schnell sehe, was in meinem Zustaendigkeitsgebiet liegt.
- AC-1: Textfeld "Strasse" im Filterbereich der Vorgangsliste
- AC-2: Teilstring-Suche (z.B. "Haupt" findet "Hauptstrasse" und "Hauptweg")
- AC-3: Filter ist kombinierbar mit Status- und Sachbearbeiter-Filter
- AC-4: Ergebnis wird sofort aktualisiert (kein separater Suchbutton noetig)

## 5. Nicht-funktionale Anforderungen

- NFR-1: Filter-Performance unter 500ms auch bei > 1000 Vorgaengen
- NFR-2: Index auf Adressfeldern fuer performante Suche

## 6. Spezialisten-Trigger

- **Senior Frontend Developer:** Filterkomponente erweitern
- **Database Architect:** Index auf Adressspalten pruefen

## 7. Offene Fragen

- Q-1: Gibt es strukturierte Adressdaten (separate Spalten) oder ein Freitext-Adressfeld?
- Q-2: Soll spaeter eine Kartenansicht (ALKIS/WMS, PROJ-15 Phase 3) integriert werden?

## 8. Annahmen

- A-1: PROJ-3 hat Adressfelder auf dem Vorgang (Strasse, PLZ, Ort)
- A-2: Keine Geocodierung noetig im MVP — reine Textfilterung

## 9. Abhaengigkeiten

- **PROJ-3** (Vorgangsverwaltung): Adressdaten auf Vorgang muessen existieren
- **PROJ-17** (Massenoperationen): Filter + Massenoperation = gefiltertes Gebiet bearbeiten

## 10. Fachliche Risiken

| Risiko | Auswirkung | Gegenmassnahme |
|---|---|---|
| Adressdaten sind unstrukturiert/unvollstaendig | Filter liefert falsche Ergebnisse | Datenqualitaet bei Import/Anlage sicherstellen |

## 11. Scope / Nicht-Scope

**Scope:**
- Textfilter fuer Strasse, PLZ, Ort in Vorgangsliste
- Kombinierbar mit bestehenden Filtern

**Nicht-Scope:**
- Kartenansicht / Geo-Visualisierung (Phase 3, PROJ-15)
- Automatische Gebietsaufteilung / Zustaendigkeitsberechnung
- PLZ-/Strassen-Verzeichnis (Autocomplete)
