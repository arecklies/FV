# ADR-015: XBau-Nachrichten-Datenmodell und Verarbeitungspipeline

## Status
Accepted (2026-03-28)

## Kontext

PROJ-7 (XBau-Basisschnittstelle) erfordert eine zentrale Nachrichtentabelle (`xbau_nachrichten`) als Kern-Entität, die von >= 3 Features referenziert wird (PROJ-7, PROJ-11, PROJ-18). Eingehende Nachrichten müssen validiert (XSD + Schematron), korreliert (bezug-Element) und gespeichert werden. Ausgehende Nachrichten müssen generiert, validiert und zum Download bereitgestellt werden.

Technologie-Entscheidungen betreffen XML-Parsing, XSD-Validierung und Schematron-Ausführung auf Vercel Serverless (Node.js).

## Entscheidung

### 1. Nachrichtentabelle `xbau_nachrichten`

Zentrale Service-Only-Tabelle für alle ein-/ausgehenden XBau-Nachrichten:
- **Korrelation** über drei Felder: `nachrichten_uuid`, `referenz_uuid`, `bezug_nachrichten_uuid`, `bezug_aktenzeichen`
- **Mandantentrennung** über `tenant_id` (Pflichtfeld, in jedem Query gefiltert)
- **Dualstruktur:** `roh_xml` (PII-sensitiv, nie an Frontend) + `kerndaten` (JSONB, extrahierte Daten für UI)
- **Status-Lifecycle:** empfangen → verarbeitet/abgewiesen (Eingang) bzw. generiert → heruntergeladen (Ausgang)
- **RLS:** deny-all (Service-Only). Zugriff nur über Backend-API

### 2. XML-Parsing: `fast-xml-parser`

- Pure JavaScript, kein Native-Binding, Vercel-kompatibel
- CJS-kompatibel (keine Jest-Probleme)
- Für Import-Parsing (eingehende Nachrichten)
- `xmlbuilder2` bleibt für Export (ADR-004, typisierte Generierung)

### 3. XSD-Validierung: Zweistufig

- **Runtime:** Programmatische Zod-Schemas, abgeleitet aus XSD-Struktur (Pflichtfelder, Typen, Enums). Schnell (< 100ms), Vercel-kompatibel
- **CI-Pipeline:** `xmllint` (libxml2 CLI) für vollständige XSD-Validierung aller generierten Nachrichten. Dev-Dependency, nicht im Produktivbetrieb
- **Begründung:** Vollständige XSD-Validierung benötigt native Bibliotheken (libxmljs2), die auf Vercel Serverless Build-Probleme verursachen. Die Zod-Validierung deckt die gleichen fachlichen Constraints ab. CI-Gate garantiert 100%-Konformität

### 4. Schematron: Saxon-JS mit Pre-Kompilierung

- Schematron-Datei (`Input/sch/xbau-schematron.sch`) verwendet `queryBinding="xslt2"` → nur XSLT-2.0-Prozessoren
- Saxon-JS als einzige reine JS-Option für XSLT 2.0
- **Pre-Kompilierung:** `.sch` → `.sef` (Saxon Execution Format) im Build-Schritt (`npm run prebuild:schematron`)
- **Runtime:** `await import('saxon-js')` (Dynamic Import, da ESM-only)
- **Jest:** Schematron-Validator wird gemockt (`jest.mock`). Schematron-Integration-Tests in separater Suite mit ESM-Runner
- **Fallback:** Bei Timeout (> 5s) oder Saxon-JS-Fehler: Nachricht wird als "Schematron-Validierung ausstehend" markiert, nicht abgewiesen

### 5. Verfahrensart-Mapping

- Neue Spalte `xbau_code` auf bestehender `config_verfahrensarten`-Tabelle
- Lookup: `WHERE xbau_code = ? AND bundesland = ?`
- Keine separate Mapping-Tabelle (vermeidet Join-Overhead und Konsistenz-Risiko)

### 6. Zuordnungsalgorithmus (Folgenachrichten)

Dreistufig, tenant-isoliert:
1. `bezug.vorgang` → `vorgaenge.aktenzeichen` WHERE `tenant_id = ?`
2. `bezug.referenz` → `xbau_nachrichten.referenz_uuid` WHERE `tenant_id = ?`
3. `bezug.bezugNachricht.nachrichtenUUID` → `xbau_nachrichten.nachrichten_uuid` WHERE `tenant_id = ?`

Fallback: Zuordnungs-Queue für manuelle Zuweisung.

## Begruendung

1. **Pure-JS-Stack** vermeidet Native-Binding-Probleme auf Vercel
2. **Zweistufige XSD-Validierung** balanciert Runtime-Performance mit CI-Garantie
3. **Saxon-JS Pre-Kompilierung** reduziert Runtime-Latenz (SEF ist optimiertes Bytecode)
4. **Service-Only-Tabelle** schützt Roh-XML (PII) vor Frontend-Zugriff
5. **Dualstruktur** (roh_xml + kerndaten) ermöglicht UI-Anzeige ohne PII-Exposure

## Verworfene Alternativen

| Alternative | Grund der Ablehnung |
|---|---|
| libxmljs2 für XSD | Native C++-Binding, Vercel-Build-Probleme |
| Java-Container für Schematron | Separate Infrastruktur, Deployment-Komplexität |
| Schematron überspringen | Verletzt XBau-Standard, ungültige Fehlerkennzahlen |
| Separate Mapping-Tabelle für Verfahrensarten | Overhead, `xbau_code`-Spalte auf bestehender Tabelle reicht |

## Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmaßnahme |
|---|---|---|---|
| Zod-Schema weicht von XSD ab | Niedrig | Ungültige Nachricht akzeptiert | CI-Gate mit xmllint |
| Saxon-JS ESM-Problem in Tests | Mittel | Tests brechen | jest.mock + separate ESM-Suite |
| Schematron-Timeout auf Serverless | Mittel | Nachricht nicht validierbar | Timeout-Fallback: "ausstehend" statt "abgewiesen" |

## Referenzen

- PROJ-7: `features/PROJ-7-xbau-basisschnittstelle.md`
- ADR-004: XBau-Integrationsstrategie
- ADR-007: Multi-Tenancy (Service-Only-Pattern)
- ADR-008: Asynchrone Verarbeitung
- XSD-Schemas: `Input/xsd+xsd_dev/xsd/`
- Schematron: `Input/sch/xbau-schematron.sch`
