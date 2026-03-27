# PROJ-58: XBau CI-Pipeline XSD-Validierung

**Status:** Planned | **Phase:** 1 (Kern-MVP) | **Erstellt:** 2026-03-27
**Herkunft:** Follow-up aus PROJ-7 Conditional Go (US-4)

---

## 1. Ziel / Problem

PROJ-7 US-4 fordert eine automatische XSD-Validierung generierter XBau-XMLs in der CI-Pipeline. Jeder Build soll sicherstellen, dass alle Nachrichtentypen schema-konform sind. Ohne CI-Validierung koennen Regressionen bei XML-Aenderungen unbemerkt bleiben.

## 2. Fachlicher Kontext & Stakeholder

- **Entwickler:** Automatische Regression bei XML-Aenderungen
- **QS Engineer:** Qualitaetssicherung der XBau-Konformitaet

## 3. Funktionale Anforderungen

- FA-1: CI-Pipeline validiert alle generierten XML-Nachrichtentypen gegen XSD
- FA-2: Referenz-XMLs aus Input/XBau-Testdateien/2.6/ als Baseline
- FA-3: XSD-Schemas werden zur Buildzeit geladen und gecacht

## 4. User Stories & Akzeptanzkriterien

### US-1: CI-XSD-Validierung
Uebernahme von PROJ-7 US-4 (AC-1 bis AC-3).
- AC-1: Validierung in CI-Pipeline integriert (Test-Suite prueft alle Nachrichtentypen)
- AC-2: Referenz-XMLs als Regression-Baseline
- AC-3: XSD-Schemas zur Buildzeit geladen, Cache-Strategie fuer Produktion

## 5. Nicht-funktionale Anforderungen

- Ausgabe von `/req-nfr` wird hier eingefuegt.

## 6. Spezialisten-Trigger

- **DevOps/Platform Engineer:** CI-Pipeline-Integration
- **Senior QS Engineer:** Test-Suite

## 7. Offene Fragen

- Keine.

## 8. Annahmen

- xmllint als CI-Validierungstool (ADR-015)
- XSD-Dateien unter Input/xsd+xsd_dev/xsd/ verfuegbar

## 9. Abhaengigkeiten

- PROJ-7 (XBau-Basisschnittstelle) -- Deployed (Conditional)
- PROJ-57 (Statistik-Nachrichten) -- Planned

## 10. Fachliche Risiken

| Risiko | Auswirkung | Gegenmassnahme |
|--------|-----------|----------------|
| Keine | -- | -- |

## 11. Scope / Nicht-Scope

**Scope:** CI-XSD-Validierung aller generierten Nachrichtentypen
**Nicht-Scope:** Schematron-Validierung in CI (siehe PROJ-59), Runtime-Validierung (bereits in PROJ-7)
