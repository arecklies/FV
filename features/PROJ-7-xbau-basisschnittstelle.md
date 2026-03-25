# PROJ-7: XBau-Basisschnittstelle

**Status:** Planned | **Phase:** 1 (Kern-MVP) | **Erstellt:** 2026-03-25

---

## 1. Ziel / Problem

XBau-Schnittstelle ist K.O.-Kriterium Nr. 3. Das System muss XBau 2.6 Nachrichten importieren (Antragseingang) und exportieren (Bescheid, Statistik). Ohne XBau keine OZG-Konformitaet und keine Anbindung an Serviceportale.

## 2. Fachlicher Kontext & Stakeholder

- **P1:** XBau fuer elektronischen Datenaustausch (fachliche Pflicht)
- **P4:** OZG-Konformitaet als strategisches Argument
- **ADR-004:** XBau-Integrationsstrategie (xmlbuilder2, Versionierung, Codelisten)
- **Referenzdaten:** XSD unter `Input/xsd+xsd_dev/xsd/`, Testdateien unter `Input/XBau-Testdateien/2.6/`

## 3. Funktionale Anforderungen

- FA-1: XBau-Import: Nachricht `baugenehmigung.antrag.0200` parsen und Vorgang anlegen
- FA-2: XBau-Import: Nachricht `statistik.datenBauvorhaben.0420` parsen
- FA-3: XBau-Export: Statistik-Nachrichten generieren (0421-0427)
- FA-4: Typisierte XML-Generierung mit xmlbuilder2 (keine String-Konkatenation)
- FA-5: Namespace-Handling: xbau (qualified) vs. Kernmodul (unqualified)
- FA-6: Codelisten-Mapping: DB-Codes <-> XBau-Codes (separate Mapping-Tabelle)
- FA-7: XSD-Validierung generierter Nachrichten
- FA-8: Manueller XML-Upload als MVP-Transportweg (vor FIT-Connect)

## 4. User Stories & Akzeptanzkriterien

### US-1: XBau-Antrag importieren
Als Sachbearbeiter moechte ich einen XBau-Bauantrag (0200) importieren und als Vorgang anlegen.
- AC-1: XML-Upload ueber UI
- AC-2: Parsing extrahiert: Bauherr, Grundstueck, Verfahrensart, Bauvorhaben, Anlagen
- AC-3: Vorgang wird mit extrahierten Daten angelegt
- AC-4: Fehlerhafte XML zeigt klare Fehlermeldung

### US-2: Statistik-Nachricht generieren
Als System moechte ich bei Baugenehmigung eine XBau-Statistiknachricht (0421) erzeugen.
- AC-1: Nachricht enthaelt alle Pflichtfelder laut XSD
- AC-2: Codelisten-Attribute (listURI, listVersionID) exakt aus XSD
- AC-3: Nachricht ist XSD-valide
- AC-4: Namespace-Qualifizierung korrekt (xbau: fuer Fachmodule, kein Prefix fuer Kernmodul)

### US-3: XBau-Validierung
Als Entwickler moechte ich generierte XMLs automatisch gegen XSD validieren.
- AC-1: Validierung in CI-Pipeline integriert
- AC-2: Referenz-XMLs aus `Input/XBau-Testdateien/2.6/` als Regression-Baseline

## 5. Nicht-funktionale Anforderungen

- NFR-1: XML-Generierung serverseitig (nicht im Browser)
- NFR-2: Codelisten nie hardcoded - immer aus Mapping-Tabelle
- NFR-3: Element-Namen und Attribute immer aus XSD abgeleitet, nie geraten

## 6. Spezialisten-Trigger

- **Backend Developer:** XBauService, XML-Builder, Codelisten-Mapping
- **QS Engineer:** Validierungstests, Referenz-XML-Vergleich
- **Database Architect:** Codelisten-Tabellen, Mapping DB <-> XBau

## 7. Offene Fragen

1. Schematron-Validierung: Saxon-JS oder externer Java-Service?
2. Welche Statistik-Nachrichtentypen im MVP (alle 8 oder Auswahl)?
3. XBau-Version pro Tenant konfigurierbar ab wann?

## 8. Annahmen

- MVP: XBau 2.6 only (keine parallelen Versionen)
- Transport: Manueller Upload/Download (FIT-Connect in Phase 2)
- Schematron-Validierung als Nice-to-Have im MVP, Pflicht ab Phase 2

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-3 (Vorgangsverwaltung) | Import legt Vorgang an |
| ADR-004 (XBau-Strategie) | Architekturentscheidung |
| XSD-Dateien unter Input/xsd+xsd_dev/ | Quelldaten |
| Testdateien unter Input/XBau-Testdateien/ | Testfixtures |

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Namespace-Fehler in generiertem XML | Mittel | Serviceportal lehnt ab | Referenz-XML-Vergleich, XSD-Validierung als Gate |
| Codelisten-Divergenz DB vs. XBau | Mittel | Invalides XML | Automatisierter Abgleich XSD <-> Mapping |
| XBau 2.7 erscheint waehrend Entwicklung | Niedrig | Nacharbeit | Versionierte Module (ADR-004) |
