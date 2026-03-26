# ADR-004: XBau-Integrationsstrategie

## Status
Accepted (Review 2026-03-26: Konsistent mit backend.md XBau-Regeln, XSD-Quelldateien, Experten-Interview Plattform-Architekt.)

## Kontext

XBau-Schnittstelle ist K.O.-Kriterium Nr. 3. XBau 2.6 hat komplexe Namespaces (qualified vs. unqualified), strikte Codelisten mit `listURI`/`listVersionID`, und versionierte Nachrichtentypen. Verschiedene Serviceportale unterstuetzen verschiedene Versionen.

## Entscheidung

### XML-Generierung
- **xmlbuilder2** als typisierte XML-Builder-Bibliothek
- Namespace-Konfiguration zentral in `src/lib/xbau/namespaces.ts`
- Builder pro Nachrichtentyp in `src/lib/xbau/messages/`

### Versionsstrategie
- Pro XBau-Version eigenes Verzeichnis: `src/lib/xbau/v2.6/`
- Gemeinsame Basis in `src/lib/xbau/shared/`
- Version pro Tenant konfigurierbar

### Codelisten
- XBau-Codes als Mapping-Tabellen in `src/lib/xbau/codelists/`
- `listURI` und `listVersionID` exakt aus XSD uebernommen
- Zwei getrennte Code-Systeme: DB-Codes (UI) vs. XBau-Codes (XML)

### Validierung
- XSD-Validierung gegen Original-Schemas unter `Input/xsd+xsd_dev/xsd/`
- Schematron-Validierung (via Saxon-JS oder Java-Container)
- Referenz-XMLs als Regression-Baseline
- Validierungstests in CI-Pipeline

### Verzeichnisstruktur
```
src/lib/xbau/
  shared/           # Versionunabhaengig (Namespaces, Basis-Typen)
  codelists/         # Code-Mappings (DB <-> XBau)
  v2.6/messages/     # Builder pro Nachrichtentyp
  parse-0420.ts      # Eingehende Nachrichten parsen
```

## Begruendung

1. Namespace-Komplexitaet: Zentrale Konfiguration verhindert Qualifizierungsfehler
2. Versionswechsel isoliert: Neues Verzeichnis, bestehende Nachrichten unveraendert
3. Zwei Code-Systeme bewusst: DB-Codes und XBau-Codes haben unterschiedliche Semantik
4. XSD als Single Source of Truth: Nie raten, immer aus XSD ableiten

## Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| XBau 2.7 Breaking Changes | Mittel | Mittel | Parallele Versionierung |
| Code-Mapping-Inkonsistenz | Mittel | Hoch | Tests gegen Referenz-XMLs |
| Namespace-Fehler in XML | Mittel | Hoch | XSD-Validierung als CI-Gate |

## Referenzen
- K.O.-Kriterium Nr. 3: `Input/AnFo/bauaufsicht_anforderungen.md`
- Backend Rules: XBau/XML-Generierung (`.claude/rules/backend.md`)
- XSD-Quelldateien: `Input/xsd+xsd_dev/xsd/`
