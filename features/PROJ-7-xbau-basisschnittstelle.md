# PROJ-7: XBau-Basisschnittstelle

**Status:** Planned | **Phase:** 1 (Kern-MVP) | **Erstellt:** 2026-03-25
**Letzte Verfeinerung:** 2026-03-28 (Eingangsvalidierung XSD+Schematron, Rueckweisung 1100, Quittung 1180, formelle Pruefung 0201, Nachrichtentabelle mit Korrelation, Transportprotokoll, Zuordnungslogik. 7 US akzeptiert — K.O.-Kriterium, kein MVP-Split)

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
- FA-3: XBau-Export: Alle 8 Statistik-Nachrichten generieren (0420-0427: Daten Bauvorhaben, Baugenehmigung, Abbruchgenehmigung, Bautaetigkeitsstatistik Hochbau, Bautaetigkeitsstatistik Tiefbau, Baufertigstellung, Bauueberhang, Wohnungsbestand)
- FA-4: Typisierte XML-Generierung mit xmlbuilder2 (keine String-Konkatenation)
- FA-5: Namespace-Handling: xbau (qualified) vs. Kernmodul (unqualified)
- FA-6: Codelisten-Mapping: DB-Codes <-> XBau-Codes (separate Mapping-Tabelle)
- FA-7: XSD-Validierung generierter Nachrichten
- FA-8: Manueller XML-Upload als MVP-Transportweg (vor FIT-Connect)
- FA-9: XBau-Export: Nachricht `baugenehmigung.formellePruefung.0201` generieren (Ergebnis der formellen Prüfung: Mängelliste, Nachforderungsfrist, Anschreiben)
- FA-10: Eingangsvalidierung: Jede eingehende XBau-Nachricht MUSS vor Verarbeitung gegen XSD und Schematron-Regeln validiert werden
- FA-11: XBau-Prozessnachricht `prozessnachrichten.rueckweisung.G2G.1100` generieren und an Absender senden bei nicht-valider Nachricht (Fehlerkennzahl, Fehlertext, abgewiesene Nachricht als Base64)
- FA-12: XBau-Prozessnachricht `prozessnachrichten.generischeQuittierungEingang.1180` generieren und an Absender senden bei erfolgreicher Annahme einer validen Nachricht
- FA-13: Nachrichtentabelle `xbau_nachrichten`: Jede ein- und ausgehende XBau-Nachricht wird mit Korrelations-IDs gespeichert (nachrichtenUUID, nachrichtentyp, bezug.referenz, bezug.vorgang, bezug.bezugNachricht, Absender, Empfaenger, Richtung, Roh-XML)
- FA-14: Automatische Zuordnung von Folgenachrichten zu bestehendem Vorgang ueber das `bezug`-Element (dreistufig: 1. bezug.vorgang → Aktenzeichen, 2. bezug.referenz → Portal-UUID, 3. bezug.bezugNachricht → Nachrichten-UUID). Fallback: manuelle Zuordnung durch Sachbearbeiter
- FA-15: Transportprotokoll je Vorgang: Chronologische Ansicht aller ein-/ausgehenden Nachrichten mit Typ, Zeitpunkt, Richtung und Verarbeitungsstatus

## 4. User Stories & Akzeptanzkriterien

### US-1: XBau-Nachricht empfangen und validieren
Als System moechte ich jede eingehende XBau-Nachricht vor der Verarbeitung validieren, damit nur standardkonforme Nachrichten zu Vorgaengen fuehren.
- AC-1: XML-Upload ueber UI (MVP-Transportweg). Akzeptierte Dateitypen: `.xml`. Max. Dateigroesse: 10 MB
- AC-2: XSD-Validierung gegen XBau 2.6 Schema (Pflicht, vor jeder Verarbeitung). XSD-Dateien aus `Input/xsd+xsd_dev/xsd/`
- AC-3: Schematron-Validierung gegen XBau-Geschaeftsregeln (`Input/sch/xbau-schematron.sch`, 759 Regeln)
- AC-4: Bei valider Nachricht: Eingangsquittung 1180 generieren, dann Nachricht verarbeiten (0200 → Vorgang anlegen)
- AC-5: Bei nicht-valider Nachricht: Rueckweisungsnachricht 1100 generieren mit standardisierter Fehlerkennzahl (X/V/S/A-Serie), Fehlertext und abgewiesener Nachricht als Base64
- AC-6: Rueckweisungsnachricht 1100 darf NICHT mit einer weiteren 1100 beantwortet werden (Kettenverbot). Eingehende 1100 wird nur gespeichert, nie mit 1100 quittiert
- AC-7: Nicht-valide Nachricht wird in Fehler-Queue gespeichert (Nachvollziehbarkeit). Roh-XML, Fehlerkennzahl, Fehlertext, Absender, Zeitpunkt
- AC-8: Sachbearbeiter sieht Fehler-Queue mit Fehlerbeschreibung und Absender-Information
- AC-9: Jede empfangene Nachricht (valide oder nicht) wird in `xbau_nachrichten` gespeichert mit: nachrichtenUUID, nachrichtentyp, richtung='eingang', tenant_id, verarbeitungsstatus, roh_xml
- AC-10: Upload-Endpunkt erfordert Authentifizierung (`requireAuth()`). Nachricht wird dem Tenant des eingeloggten Nutzers zugeordnet
- AC-11: Nicht-XML-Dateien (z.B. PDF) oder leere Uploads werden mit HTTP 400 abgewiesen (keine Rueckweisung 1100, da kein XBau)

### US-1a: Vorgang aus validem 0200-Antrag anlegen
Als Sachbearbeiter moechte ich aus einem validierten XBau-Bauantrag (0200) einen Vorgang anlegen.
- AC-1: Parsing extrahiert: Bauherr (Name, Anschrift), Grundstueck (Adresse, Flurstueck, Gemarkung), Verfahrensart, Bauvorhaben (Bezeichnung), Anlagen-Metadaten
- AC-2: Vorgang wird mit extrahierten Daten ueber `createVorgang()` angelegt (Status: "eingegangen"). Bestehende Pflichtfeld-Validierung (bauherr_name, grundstueck) greift
- AC-3: Verfahrensart-Mapping: XBau-Verfahrensart-Code wird auf `config_verfahrensarten.kuerzel` gemappt. Bei unbekanntem Code: Fallback auf Default-Verfahrensart oder Fehler-Queue
- AC-4: `bezug.referenz` (Portal-UUID) wird in `xbau_nachrichten.referenz_uuid` gespeichert (fuer spaetere Folgenachrichten-Zuordnung)
- AC-5: Quellnachricht wird im Vorgang als Transportprotokoll-Eintrag verknuepft (`xbau_nachrichten.vorgang_id`)
- AC-6: Audit-Log: `vorgang.created_from_xbau` mit Quellnachrichten-UUID
- AC-7: Bei Parser-Fehler trotz valider XSD: Fehler-Queue mit Benachrichtigung (Implementierungsfehler, nicht XBau-Rueckweisung)
- AC-8: Duplikat-Schutz: Wenn dieselbe nachrichtenUUID bereits verarbeitet wurde, kein neuer Vorgang (idempotent). Hinweis an Sachbearbeiter

### US-1b: Folgenachrichten automatisch zuordnen
Als System moechte ich eingehende Folgenachrichten (z.B. 0202 Antragsaenderung) automatisch dem richtigen Vorgang zuordnen, damit der Sachbearbeiter keine manuelle Zuordnung vornehmen muss.
- AC-1: System liest `bezug`-Element der eingehenden Nachricht aus (referenz, vorgang, bezugNachricht)
- AC-2: Zuordnung priorisiert: (1) `bezug.vorgang` → Match auf `vorgaenge.aktenzeichen` + `tenant_id`, (2) `bezug.referenz` → Match auf `xbau_nachrichten.referenz_uuid` + `tenant_id`, (3) `bezug.bezugNachricht.nachrichtenUUID` → Match auf `xbau_nachrichten.nachrichten_uuid` + `tenant_id`
- AC-3: Zuordnung MUSS tenant-isoliert sein. Cross-Tenant-Match ist ausgeschlossen (alle Queries filtern auf `tenant_id`)
- AC-4: Bei eindeutigem Match: Nachricht wird dem Vorgang zugeordnet, Transportprotokoll-Eintrag erstellt
- AC-5: Bei Mehrfach-Match oder keinem Match: Nachricht landet in Zuordnungs-Queue, Sachbearbeiter ordnet manuell zu
- AC-6: Sachbearbeiter kann in der Zuordnungs-Queue eine Nachricht einem Vorgang zuweisen (Aktenzeichen-Suche, nur eigener Tenant)
- AC-7: Zugeordnete Folgenachricht ist im Transportprotokoll des Vorgangs sichtbar

### US-1c: Transportprotokoll einsehen
Als Sachbearbeiter moechte ich im Vorgang eine chronologische Uebersicht aller XBau-Nachrichten sehen, damit ich den Kommunikationsverlauf nachvollziehen kann.
- AC-1: Tab "Nachrichten" auf der Vorgang-Detailseite (neben bestehenden Tabs: Uebersicht, Fristen, Kommentare, Workflow)
- AC-2: Chronologische Liste: Zeitpunkt, Nachrichtentyp (z.B. "0200 Bauantrag"), Richtung (Eingang ↓ / Ausgang ↑), Verarbeitungsstatus
- AC-3: Eingehende Nachrichten zeigen Absender-Behoerde (aus Nachrichtenkopf.autor)
- AC-4: Ausgehende Nachrichten zeigen Empfaenger und Zustellstatus (generiert/heruntergeladen)
- AC-5: Klick auf Nachricht zeigt Detail-Ansicht mit extrahierten Kerndaten (kein Roh-XML fuer Endnutzer)
- AC-6: Empty State: "Keine XBau-Nachrichten vorhanden" wenn Tab leer
- AC-7: Loading State: Skeleton waehrend Laden

### US-2: Formelle Prüfung versenden (0201)
Als Sachbearbeiter moechte ich nach der Vollstaendigkeitspruefung eine XBau-Nachricht an den Entwurfsverfasser senden, die mitteilt ob der Antrag vollstaendig ist oder welche Unterlagen fehlen.
- AC-1: Workflow-Aktion "Formelle Prüfung abschließen" erzeugt 0201-Nachricht
- AC-2: Bei unvollstaendigem Antrag: `antragVollstaendig=false`, strukturierte Befundliste (Freitext je Befund), Nachforderungsfrist (Datum)
- AC-3: Bei vollstaendigem Antrag: `antragVollstaendig=true`, Bearbeitungsfrist-Information
- AC-4: Optionales Anschreiben (Freitext) mit Hinweis auf Ruecknahmefiktion bei Fristablauf
- AC-5: Generierte 0201-Nachricht ist XSD-valide (automatische Validierung vor Speicherung)
- AC-6: Nachricht wird in `xbau_nachrichten` gespeichert (richtung='ausgang', vorgang_id, verarbeitungsstatus='generiert')
- AC-7: Nachricht wird als XML-Datei zum Download bereitgestellt (MVP: manueller Download, kein automatischer Versand)
- AC-8: 0201 kann je Vorgang mehrfach versendet werden (z.B. nach Nachreichung erneute Pruefung mit neuer Befundliste)
- AC-9: Nachforderungsfrist wird als Frist im Fristmanagement (PROJ-4) angelegt: `createFrist()` mit Typ 'nachforderung'
- AC-10: Audit-Log: `xbau.0201_generated` mit Vorgang-ID und antragVollstaendig-Wert

### US-3: Statistik-Nachrichten generieren (0420-0427)
Als System moechte ich alle 8 XBau-Statistiknachrichten (0420-0427) erzeugen koennen.
- AC-1: Jede Nachricht enthaelt alle Pflichtfelder laut XSD
- AC-2: Codelisten-Attribute (listURI, listVersionID) exakt aus XSD (Referenz: `xbau-codes.xsd`)
- AC-3: Alle Nachrichten sind XSD-valide (automatische Validierung vor Speicherung)
- AC-4: Namespace-Qualifizierung korrekt (xbau: fuer Fachmodule, kein Prefix fuer Kernmodul)
- AC-5: Jeder Nachrichtentyp hat mindestens einen Unit-Test gegen Referenz-XML
- AC-6: Codelisten-Mapping DB → XBau nutzt `config_xbau_codelisten`-Tabelle (kein hardcoded Mapping in Generatoren)
- AC-7: Generierte Nachrichten werden in `xbau_nachrichten` gespeichert (richtung='ausgang')

### US-4: XBau-Validierung
Als Entwickler moechte ich generierte XMLs automatisch gegen XSD validieren.
- AC-1: Validierung in CI-Pipeline integriert (Test-Suite prueft alle Nachrichtentypen)
- AC-2: Referenz-XMLs aus `Input/XBau-Testdateien/2.6/` als Regression-Baseline
- AC-3: XSD-Schemas werden zur Buildzeit geladen (nicht bei jedem Request). Cache-Strategie fuer Produktivbetrieb

## 5. Nicht-funktionale Anforderungen

- NFR-1: XML-Generierung und -Validierung serverseitig (nicht im Browser)
- NFR-2: Codelisten nie hardcoded — immer aus Mapping-Tabelle (`config_xbau_codelisten`)
- NFR-3: Element-Namen und Attribute immer aus XSD abgeleitet, nie geraten
- NFR-4: XSD-Validierung < 2 Sekunden je Nachricht (XSD-Schemas gecacht)
- NFR-5: Schematron-Validierung < 5 Sekunden je Nachricht (759 Regeln)
- NFR-6: Upload-Limit: 10 MB je XML-Datei
- NFR-7: `xbau_nachrichten`-Tabelle ist Service-Only (deny-all RLS). Zugriff nur ueber Backend-API mit tenant_id-Filter
- NFR-8: Roh-XML wird gespeichert aber NICHT an Frontend ausgeliefert (PII-Schutz). Nur extrahierte Kerndaten sichtbar
- NFR-9: Alle XBau-Service-Funktionen erhalten `SupabaseClient` als Parameter (DI-Pattern wie verfahren/index.ts)

## 6. Spezialisten-Trigger

- **Backend Developer:** XBauService, XML-Builder, Codelisten-Mapping, Zuordnungslogik
- **QS Engineer:** Validierungstests, Referenz-XML-Vergleich fuer alle 8 Nachrichtentypen, Zuordnungs-Tests
- **Database Architect:** Codelisten-Tabellen, Mapping DB <-> XBau, xbau_nachrichten-Tabelle, Transportprotokoll
- **Frontend Developer:** Transportprotokoll-Tab, Fehler-Queue-Ansicht, Zuordnungs-Queue
- **Security Engineer:** Roh-XML-Speicherung (kein PII-Leaking), Service-Only RLS auf xbau_nachrichten

## 7. Offene Fragen

1. ~~Schematron-Validierung: Saxon-JS oder externer Java-Service?~~ **Geklaert (ADR-015):** Saxon-JS mit Pre-Kompilierung (.sch → .sef). Dynamic Import, Jest-Mock.
2. ~~Welche Statistik-Nachrichtentypen im MVP?~~ **Geklaert:** Alle 8 Typen (0420-0427) im MVP. Vollstaendige OZG-Konformitaet ist K.O.-Kriterium.
3. XBau-Version pro Tenant konfigurierbar ab wann? (MVP: nur XBau 2.6)
4. ~~XSD-Validierungsbibliothek~~ **Geklaert (ADR-015):** Zweistufig: Zod-Schemas (Runtime) + xmllint (CI). Kein libxmljs2.
5. ~~Verfahrensart-Mapping~~ **Geklaert (ADR-015):** Neue Spalte `xbau_code` auf `config_verfahrensarten`. Kein separates Mapping.

## 8. Annahmen

- MVP: XBau 2.6 only (keine parallelen Versionen)
- Transport: Manueller Upload/Download (FIT-Connect in Phase 2, PROJ-11)
- Schematron-Validierung ist Pflicht im MVP (XBau-Standard schreibt Validierung vor, Rueckweisung 1100 erfordert korrekte Fehlerkennzahlen)
- Alle 8 Statistik-Nachrichtentypen im MVP-Scope

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-3 (Vorgangsverwaltung) | Import legt Vorgang an, Workflow-Schritt "eingegangen" |
| PROJ-4 (Fristmanagement) | 0201 setzt Nachforderungsfrist |
| ADR-004 (XBau-Strategie) | Architekturentscheidung |
| XSD-Dateien unter Input/xsd+xsd_dev/ | Quelldaten |
| Testdateien unter Input/XBau-Testdateien/ | Testfixtures |

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Namespace-Fehler in generiertem XML | Mittel | Serviceportal lehnt ab | Referenz-XML-Vergleich, XSD-Validierung als Gate |
| Codelisten-Divergenz DB vs. XBau | Mittel | Invalides XML | Automatisierter Abgleich XSD <-> Mapping |
| XBau 2.7 erscheint waehrend Entwicklung | Niedrig | Nacharbeit | Versionierte Module (ADR-004) |
| 8 Nachrichtentypen erhoehen Implementierungsaufwand | Mittel | Verzoegerung | Gemeinsamer XML-Builder, Nachrichtentypen teilen Kernmodul-Struktur |
| Folgenachricht ohne bezug-Element oder mit ungueltigem Aktenzeichen | Mittel | Nachricht nicht zuordenbar | Zuordnungs-Queue mit manueller Zuweisung durch SB |
| Roh-XML-Speicherung enthaelt personenbezogene Daten | Hoch | DSGVO-Relevanz | Service-Only RLS, kein Roh-XML-Zugriff fuer Endnutzer, Loeschkonzept (PROJ-41) |

## 11. Scope / Nicht-Scope

**Scope:**
- Eingangsvalidierung: XSD + Schematron fuer JEDE eingehende Nachricht
- Prozessnachrichten: Rueckweisung 1100 (bei Fehler) und Quittung 1180 (bei Erfolg)
- Import: 0200 (Bauantrag) parsen und Vorgang anlegen
- Import: 0420 (Statistik-Daten) parsen
- Import: Folgenachrichten (z.B. 0202) automatisch per bezug-Element zuordnen
- Export: 0201 (Formelle Prüfung — Mängelliste oder Vollständigkeitsbestätigung)
- Export: 0420-0427 (alle 8 Statistik-Nachrichten)
- Nachrichtentabelle: Alle ein-/ausgehenden Nachrichten mit Korrelations-IDs speichern
- Transportprotokoll: Chronologische Nachrichten-Uebersicht je Vorgang
- Fehler-Queue + Zuordnungs-Queue fuer nicht-valide bzw. nicht-zuordenbare Nachrichten
- Manueller XML-Upload/Download als MVP-Transportweg

**Nicht-Scope:**
- Automatischer Transport (XTA-Polling in PROJ-11, FIT-Connect in PROJ-18)
- Bescheid-Nachricht 0210 (eigenes Feature, nach PROJ-6 Bescheiderzeugung)
- Digitale Signatur der Nachrichten
- Automatische Verarbeitung von Folgenachrichten (z.B. 0202 → Vorgang aktualisieren) — MVP zeigt sie nur im Transportprotokoll
