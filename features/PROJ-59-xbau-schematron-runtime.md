# PROJ-59: XBau Schematron-Runtime-Validierung

**Status:** Planned | **Phase:** 1 (Kern-MVP) | **Erstellt:** 2026-03-27
**Herkunft:** Follow-up aus PROJ-7 Conditional Go (Schematron-Runtime)

---

## 1. Ziel / Problem

PROJ-7 erfordert Schematron-Validierung eingehender XBau-Nachrichten (759 Geschaeftsregeln). Die Runtime-Validierung mit Saxon-JS und pre-kompilierten .sef-Dateien muss produktionsreif implementiert werden. Ohne Schematron koennen fachlich ungueltige Nachrichten nicht korrekt mit Fehlerkennzahlen (S-Serie) zurueckgewiesen werden.

## 2. Fachlicher Kontext & Stakeholder

- **XBau-Standard:** Schematron-Validierung ist vorgeschrieben
- **ADR-015:** Saxon-JS mit Pre-Kompilierung (.sch → .sef)
- **PROJ-7 NFR-5:** Schematron-Validierung < 5 Sekunden je Nachricht

## 3. Funktionale Anforderungen

- FA-1: Schematron-Regeln aus Input/sch/xbau-schematron.sch pre-kompilieren zu .sef
- FA-2: Runtime-Validierung eingehender Nachrichten mit Saxon-JS
- FA-3: Fehler aus Schematron-Validierung in Rueckweisung 1100 mit S-Serie-Fehlerkennzahl abbilden
- FA-4: Pre-kompilierte .sef-Dateien cachen (nicht bei jedem Request neu kompilieren)

## 4. User Stories & Akzeptanzkriterien

### US-1: Schematron-Validierung in Produktionsbetrieb
- AC-1: .sch → .sef Pre-Kompilierung als Build-Schritt
- AC-2: Saxon-JS validiert eingehende Nachrichten gegen .sef in < 5 Sekunden
- AC-3: Schematron-Fehler werden als S-Serie-Fehlerkennzahl in 1100-Rueckweisung abgebildet
- AC-4: .sef-Dateien werden gecacht (Filesystem oder Memory)
- AC-5: Dynamic Import von Saxon-JS (kein Top-Level-Import, ADR-015)
- AC-6: Jest-Tests mocken Saxon-JS (ESM-Inkompatibilitaet, ADR-015)

## 5. Nicht-funktionale Anforderungen

- NFR-1: < 5 Sekunden Validierungszeit je Nachricht (759 Regeln)
- NFR-2: .sef-Cache-Invalidierung bei XBau-Version-Update

## 6. Spezialisten-Trigger

- **Senior Backend Developer:** Saxon-JS-Integration, .sef-Caching
- **DevOps/Platform Engineer:** Build-Schritt .sch → .sef

## 7. Offene Fragen

- Keine (geklaert in ADR-015).

## 8. Annahmen

- Saxon-JS ist als Dependency verfuegbar (xbau-service/package.json)
- .sch-Datei liegt unter Input/sch/

## 9. Abhaengigkeiten

- PROJ-7 (XBau-Basisschnittstelle) -- Deployed (Conditional)
- ADR-015 (XBau-Service-Isolation)

## 10. Fachliche Risiken

| Risiko | Auswirkung | Gegenmassnahme |
|--------|-----------|----------------|
| Saxon-JS Performance bei 759 Regeln | Timeout bei grossen Nachrichten | Benchmark vor Produktivsetzung, ggf. Regeln partitionieren |

## 11. Scope / Nicht-Scope

**Scope:** Runtime Schematron-Validierung mit Saxon-JS, .sef-Caching, S-Serie Fehlermapping
**Nicht-Scope:** Schematron in CI-Pipeline (eigenes Item), eigene Geschaeftsregeln (nur XBau-Standard)
