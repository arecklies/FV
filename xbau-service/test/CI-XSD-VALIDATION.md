# CI-Pipeline XSD-Validierung (PROJ-58)

## Uebersicht

Die XSD-Validierungssuite prueft generierte XBau-XMLs auf strukturelle Korrektheit.
Sie laeuft als Teil der xbau-service Test-Suite.

## Ausfuehrung

```bash
# Alle xbau-service Tests
cd xbau-service
npm test

# Nur XSD-Validierung
npm run test:xsd
```

## Was wird geprueft

### Stufe 1: Strukturelle Validierung (immer aktiv)
- XML-Wohlgeformtheit (fast-xml-parser)
- Root-Element und Namespace-Korrektheit
- Pflicht-Elemente gemaess XSD-Definition
- Root-Attribute (produkt, produkthersteller, etc.)
- Codeliste-URIs
- Namespace-Qualifizierung (Hochbau: qualified, Kernmodul: unqualified)

### Stufe 2: Referenz-XML Regression (immer aktiv)
- Wohlgeformtheit aller Referenz-XMLs unter Input/XBau-Testdateien/2.6/
- Root-Element und Namespace-Pruefung
- Statistik-Nachrichten-Samples (0421-0427)

### Stufe 3: XSD Schema Integrity (immer aktiv)
- XSD-Dateien existieren und sind parsebar
- Element-Definitionen sind in den XSD-Dateien vorhanden

### Stufe 4: xmllint XSD-Validierung (optional, CI-only)
- Vollstaendige Schema-Validierung mit xmllint
- Aktuell geskippt (xmllint nicht installiert)
- Aktivierung: siehe unten

## CI-Pipeline Integration

### GitHub Actions Beispiel

```yaml
name: XBau XSD Validation
on: [push, pull_request]

jobs:
  xsd-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: xbau-service
        run: npm ci

      - name: Run XSD validation
        working-directory: xbau-service
        run: npm run test:xsd

      # Optional: xmllint fuer vollstaendige XSD-Validierung
      # - name: Install xmllint
      #   run: sudo apt-get install -y libxml2-utils
      # - name: Run xmllint validation
      #   run: ... (siehe Stufe 4 Aktivierung)
```

### Vercel Build Integration

Die Tests koennen als Pre-Build-Step in der Vercel-Konfiguration eingebunden werden:

```json
{
  "buildCommand": "cd xbau-service && npm ci && npm run test:xsd && cd .. && next build"
}
```

## xmllint Aktivierung (Stufe 4)

Voraussetzungen:
1. `libxml2-utils` installiert (`apt-get install -y libxml2-utils`)
2. Alle referenzierten externen Schemas lokal verfuegbar (xoev.de Basisnachricht-Schemas)
3. Schema-Locations in XSD-Dateien auf lokale Pfade angepasst

Hinweis: Die XSD-Dateien referenzieren externe URLs fuer Basis-Schemas:
- `http://xoev.de/schemata/basisnachricht/g2g/1_1/xoev-basisnachricht-g2g_1.1.xsd`
- `http://xoev.de/schemata/basisnachricht/unqualified/g2g/1_1/xoev-basisnachricht-unqualified-g2g_1.1.xsd`

Fuer Offline-CI muessen diese heruntergeladen und die schemaLocation-Pfade angepasst werden.

## Abgedeckte Nachrichtentypen

| Nachricht | Builder | XSD-Quelle | Namespace |
|-----------|---------|------------|-----------|
| 0201 (Formelle Pruefung) | build-0201.js | xbau-nachrichten-baugenehmigung.xsd | xbau (Hochbau) |
| 1100 (Rueckweisung G2G) | build-1100.js | xbau-kernmodul-prozessnachrichten.xsd | xbauk (Kernmodul) |
| 1180 (Eingangsquittung) | build-1180.js | xbau-kernmodul-prozessnachrichten.xsd | xbauk (Kernmodul) |

## Erweiterung

Bei neuen Message Buildern:
1. Schema-Definition in `SCHEMA_XXXX` Konstante hinzufuegen (Root-Element, Namespace, Pflicht-Elemente aus XSD)
2. Test-Block mit Fixtures, Well-Formedness, Root-Element, Namespace und Required-Elements Tests
3. Namespace-Consistency-Test ergaenzen
