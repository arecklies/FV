# Anforderungskatalog
## SaaS-Webanwendung für die untere Bauaufsichtsbehörde
**Version 1.0 | Stand: März 2026**

---

## 1. Vorbemerkung und Ausgangslage

Als langjähriger Sachbearbeiter in der unteren Bauaufsicht bin ich es gewohnt, mit lokal installierten Fachverfahren zu arbeiten (z. B. ProBauG, IDA Baugenehmigung, NOLIS, ADVOBAURECHT o. ä.). Der Wechsel auf eine SaaS-Webanwendung bringt sowohl Chancen als auch Risiken. Die nachfolgenden Anforderungen sind aus der täglichen Praxis heraus formuliert und erheben den Anspruch auf vollständige Abbildung des Verwaltungsalltags in der Bauaufsicht.

---

## 2. Fachliche Anforderungen

### 2.1 Verfahrensarten und Antragstypen
Das System muss **alle gängigen Genehmigungsverfahren** nach der jeweiligen Landesbauordnung abbilden:

- Baugenehmigungsverfahren (regulär, vereinfacht, Freistellungsverfahren)
- Vorbescheidsverfahren / Bauvorbescheid
- Abweichungen, Befreiungen und Ausnahmen (§ 31 BauGB / LBO)
- Nachtragsgenehmigungen
- Nutzungsänderungen
- Abbruchgenehmigungen
- Typengenehmigungen / Typenzulassungen
- Bauüberwachung und Bauzustandsbesichtigungen
- Ordnungswidrigkeitenverfahren (OWiG)
- Baueinstellungsverfügungen, Abrissanordnungen
- Verfahren nach § 79 BauO (schwarzer Bau / Schwarzbauverfahren)
- Baulastenverfahren

### 2.2 Vorgangsbearbeitung
- Vollständige **Akte digital** – kein paralleles Papierverfahren mehr erforderlich
- Automatische **Fristverwaltung** (z. B. 3-Monats-Frist nach § 75 BauO NRW, Unvollständigkeitsnachricht innerhalb 10 Tagen)
- **Fristkalender** mit Eskalationsmechanismus und konfigurierbaren Erinnerungen (E-Mail, In-App)
- Workflow-Engine: konfigurierbare Bearbeitungsschritte je Verfahrensart, Status-Tracking
- Vorgangsnummernvergabe nach eigenem Aktenzeichen-Schema (konfigurierbar, Jahrgang, Laufnummer, Verfahrensart-Kürzel)
- **Beteiligungsmanagement**: Interne Stellen (Tiefbauamt, Denkmalschutz, Feuerwehr, Gesundheitsamt) sowie externe Träger öffentlicher Belange (TÖB) wie Straßenbaulastträger, Versorgungsunternehmen, Naturschutzbehörde
- Wiedervorlageverwaltung mit individuellen Notizen
- Parallele Bearbeitung durch mehrere Sachbearbeiter (gemeinsamer Zugriff auf Vorgänge mit Änderungsprotokoll)

### 2.3 Antragsteller- und Beteiligtenmanagement
- **Stammdatenverwaltung** für Bauherren, Entwurfsverfasser, Statiker, Nachweisberechtigte, Eigentümer, bevollmächtigte Architekten/Ingenieure
- Zuordnung mehrerer Rollen einer Person zu verschiedenen Vorgängen
- Kammermitgliedschafts-Prüfung (Architektenkammer, Ingenieurkammer) – idealerweise per Schnittstelle oder manuell pflegbar
- Vollmachtsverwaltung inkl. Frist und Dokumentenablage

### 2.4 Grundstücks- und Liegenschaftsdaten
- Anbindung an das **Liegenschaftskataster / ALKIS** (über WFS/WMS oder direkte API)
- Flurstückssuche nach Gemarkung, Flur, Flurstück sowie nach Adresse
- Verknüpfung eines Vorgangs mit einem oder mehreren Flurstücken
- Anzeige von Bebauungsplänen, Flächennutzungsplänen (WMS-Dienste der Gemeinde)
- Eintragung von **Baulasten** mit Katasternachweis

### 2.5 Dokumentenverwaltung
- Strukturierte Ablage aller verfahrensrelevanten Dokumente (Antragsunterlagen, Pläne, Gutachten, Bescheide, Schriftverkehr)
- **Versionierung** von Plänen (z. B. Nachtrag: Plan-Rev. 2 ersetzt Rev. 1)
- Unterstützung gängiger Formate: PDF, DWG, DXF, TIFF, JPEG, XLS/XLSX, DOCX
- Maximale Dateigröße je Upload: mindestens 200 MB, besser 500 MB (Großformatpläne)
- Scanschnittstelle / Integration mit Dokumentenscanner (TWAIN oder ähnlich)
- Digitaler Posteingangsstempel
- Volltextsuche über den Dokumentenbestand (OCR-Indexierung)

### 2.6 Bescheid- und Dokumentenerzeugung
- Integrierter **Vorlagen-Editor** auf Basis von Word-kompatiblen Templates (.docx) oder HTML
- Automatische Befüllung mit Vorgangsdaten (Adresse, Aktenzeichen, Antragsteller, Bauvorhaben, Fristen, Nebenbestimmungen)
- **Nebenbestimmungsbausteine**: durchsuchbare Textbausteinbibliothek, je Verfahrensart filterbar, eigenständig pflegbar durch die Behörde
- Erzeugte Bescheide als PDF/A für revisionssichere Archivierung
- Signaturintegration (qualifizierte elektronische Signatur, z. B. über D-Trust/Bundesdruckerei)
- Versandweg steuerbar: Postversand (Print-on-Demand), E-Mail, De-Mail, EGVP, Bürgerportal

### 2.7 Gebühren und Kassenwesen
- **Gebührenberechnung** nach der jeweiligen Allgemeinen Verwaltungsgebührenordnung (AVerwGebO) des Landes bzw. kommunaler Gebührensatzung
- Parametrisierbare Gebührentabellen (Bauwert, BGF, BRI, Pauschalgebühren)
- Automatischer Gebührenvorschlag mit manueller Überschreibungsmöglichkeit (mit Begründungspflicht)
- Erstellung von **Gebührenbescheiden** aus dem System heraus
- Schnittstelle zur kommunalen Finanzsoftware (z. B. KFM, SAP, newsystem kommunal, Datev) für Buchung und Sollstellung
- Verfolgung von Zahlungseingängen (Statusrückmeldung aus der Finanzsoftware)
- Mahnaggregation / Übergabe an Vollstreckungsstelle

---

## 3. Technische Anforderungen

### 3.1 Allgemeine Systemanforderungen
- **Browserbasiert** – vollständige Funktionalität in aktuellen Browsern (Chrome, Firefox, Edge) ohne Plugin-Installation
- Responsive Design mindestens für Desktop und Tablet (Vor-Ort-Nutzung bei Baustellenbesichtigungen)
- Keine lokale Softwareinstallation erforderlich (reines SaaS)
- **Offlinefähigkeit** (zumindest lesender Zugriff) für Außendiensteinsätze mit instabiler Verbindung (Progressive Web App oder ähnlich)

### 3.2 Performance
- Seitenaufbau < 2 Sekunden bei normaler Behördenanbindung (50 Mbit/s)
- Dokumentenvorschau (PDF, TIFF) < 3 Sekunden für Dateien bis 10 MB
- Gleichzeitige Nutzung durch mindestens 50 Sachbearbeiter ohne Leistungseinbuße
- Systemverfügbarkeit: **99,5 % im Jahresmittel** (Wartungsfenster außerhalb der Kernarbeitszeit 07:00–18:00 Uhr werktags)

### 3.3 Datenschutz und Datensicherheit (DSGVO / BSI)
- Hosting ausschließlich in einem **deutschen oder EU-Rechenzentrum** (kein Datentransfer in Drittstaaten)
- Einhaltung der **BSI-Grundschutz-Anforderungen** (Zertifizierung oder nachgewiesene Orientierung daran)
- Datenverarbeitungsvertrag (AVV) nach Art. 28 DSGVO mit dem SaaS-Anbieter
- Ende-zu-Ende-Verschlüsselung der Datenübertragung (TLS 1.2 oder höher)
- **Verschlüsselte Datenhaltung** at rest (AES-256 oder gleichwertig)
- Rollenbasiertes Berechtigungskonzept (RBAC) mit feingranularer Steuerung auf Verfahrens- und Feldebene
- **Mandantentrennung**: Daten verschiedener Kommunen strikt getrennt
- Automatische Sitzungsabmeldung nach konfigurierbarer Inaktivität (Standard: 15 Minuten)
- Audit-Trail: unveränderliches Protokoll aller Lese- und Schreibzugriffe (wer hat wann was geändert)

### 3.4 Authentifizierung und Benutzerverwaltung
- **Single Sign-On (SSO)** über SAML 2.0 oder OpenID Connect (Anbindung an Active Directory / LDAP der Kommune)
- Zwei-Faktor-Authentifizierung (2FA) als Option / erzwingbar je Rolle
- Benutzerverwaltung durch lokale Administratoren der Behörde (kein Ticketsystem zum Anbieter nötig für einfache Aufgaben wie Passwort-Reset, Rollenzuweisung)

### 3.5 Schnittstellen (APIs und Standards)
- **XBau-Schnittstelle** (XÖV-Standard für Baugenehmigungswesen) für den elektronischen Datenaustausch
- **OZG / SDG-Konformität**: Anbindung an das Onlinezugangsgesetz-Portal / Serviceportal des Landes NRW (Antragseingang über Bürgerportale)
- EGVP / OSCI-Schnittstelle für sicheren Behördennachrichtenverkehr
- WMS/WFS-Dienste für Geodaten (OGC-konform)
- REST-API (dokumentiert, versioniert) für eigene Integrationen der Behörde
- Schnittstelle zu Dokumentenmanagementsystemen (DMS, z. B. d.3, enaio, d.velop) via CMIS
- E-Mail-Integration (SMTP/IMAP) für automatisierten Schriftverkehr

### 3.6 Datenmigration
- **Migrationswerkzeug** für Altdaten aus bisherigen Fachverfahren (strukturierter Import via CSV/XML mit Mapping-Oberfläche)
- Übernahme historischer Vorgänge zumindest als PDF-Dokumente mit Metadaten (Aktenzeichen, Datum, Grundstück)
- Testmigration auf isolierter Staging-Umgebung vor Go-live
- Nachweisbare Vollständigkeit der migrierten Datensätze (Protokoll, Abweichungsberichte)

---

## 4. Betrieb und SaaS-spezifische Anforderungen

### 4.1 Service Level Agreement (SLA)
- Schriftliches SLA mit messbaren KPIs (Verfügbarkeit, Reaktionszeit, Wiederherstellungszeit)
- **Störungsklassen** mit definierten Reaktionszeiten:
  - Kritisch (System nicht nutzbar): Reaktion < 1 Stunde, Lösung < 4 Stunden
  - Hoch (Kernfunktion eingeschränkt): Reaktion < 4 Stunden, Lösung < 1 Werktag
  - Mittel / Niedrig: Reaktion < 1 Werktag, Lösung nach Vereinbarung
- **Monatliches Reporting** über Verfügbarkeit, Vorfälle, Wartungsarbeiten

### 4.2 Backup und Notfallbetrieb
- Tägliche Datensicherung, mindestens 30 Tage Aufbewahrung
- Recovery Time Objective (RTO): < 4 Stunden
- Recovery Point Objective (RPO): < 24 Stunden (idealerweise < 1 Stunde)
- Notfallkonzept dokumentiert und mindestens jährlich getestet
- **Datenexport jederzeit möglich** (vollständiger Export aller eigenen Daten in maschinenlesbarem Format, z. B. XML/JSON + PDF) – keine Vendor-Lock-in-Falle

### 4.3 Updates und Releasepolitik
- **Ankündigung von Updates** mindestens 4 Wochen im Voraus (bei rechtlichen Anpassungen ggf. kürzere Frist, aber dann mit expliziter Kommunikation)
- Kein erzwungener Wechsel auf neue Oberflächen ohne Übergangszeit und Schulungsangebot
- **Testumgebung (Staging)** steht dauerhaft zur Verfügung, um Updates vor der Produktivübernahme zu prüfen
- Changelog transparent und vollständig dokumentiert

### 4.4 Support und Wartung
- Deutschsprachiger Support mit festen Ansprechpartnern (kein reines Ticketsystem ohne persönlichen Kontakt)
- Supportzeiten mindestens Mo–Fr 08:00–17:00 Uhr (erreichbar telefonisch und per Ticket)
- **Wissensdatenbank / Self-Service-Portal** mit aktuellen Handbüchern, FAQ, Video-Tutorials
- Nutzer-Community oder Anwenderkreis für den Austausch zwischen Behörden

---

## 5. Ergonomie und Benutzerfreundlichkeit

- **Tastaturnavigation** vollständig möglich (kein Maus-Zwang – erfahrene Sachbearbeiter arbeiten schneller über Tastatur)
- Intelligente **Suchfunktion** über alle Vorgänge (nach Aktenzeichen, Adresse, Name, Flurstück, Status)
- Persönliche **Startseite / Dashboard** mit konfigurierbaren Widgets: eigene offene Vorgänge, anstehende Fristen, Wiedervorlagen, Posteingang
- **Mehrfenster-/Mehrregisterfähigkeit**: gleichzeitiges Öffnen mehrerer Vorgänge in verschiedenen Browser-Tabs ohne Konflikte
- **Massenoperationen**: z. B. Fristverschiebung oder Statusänderung für mehrere Vorgänge gleichzeitig
- Feldvalidierung mit klaren, verständlichen Fehlermeldungen (keine technischen Codes)
- Barrierefreiheit nach **WCAG 2.1 AA** (Anforderung gemäß BITV 2.0 für öffentliche Stellen)
- **Druckfunktion** für Aktendeckblätter, Vorgangslisten, Prüfprotokolle

---

## 6. Rechtliche und organisatorische Anforderungen

- Anpassbarkeit an **länderspezifische Bauordnungen** (mindestens BauO NRW, perspektivisch weitere Länder)
- Konfigurierbarkeit behördeninterner Prozesse durch eigene Administratoren (keine kostenpflichtigen Anpassungsaufträge für Routineänderungen)
- **Revisionssichere Archivierung** (TR-ESOR oder vergleichbar) mit automatischer Archivierung abgeschlossener Vorgänge
- Aufbewahrungsfristen je Dokumententyp konfigurierbar und automatisch überwacht
- Statistische Auswertungen und **Berichtswesen** (Anzahl Vorgänge je Status/Typ/Zeitraum, Bearbeitungszeiten, Rückstandslisten) – als Export (Excel, CSV, PDF)
- **Datenschutzfolgenabschätzung (DSFA)** durch den Anbieter bereitgestellt oder Unterstützung bei der Erstellung

---

## 7. Einführung und Schulung

- **Projektbegleitung** durch den Anbieter: dedizierter Einführungsberater
- Schulungskonzept mit Train-the-Trainer-Ansatz für behördeninterne Multiplikatoren
- Testinstanz mit Beispieldaten für die Einarbeitungsphase
- Schulungsunterlagen und E-Learning-Module auf Deutsch, aktuell gehalten
- Go-Live-Support (mindestens 4 Wochen intensiver Vor-Ort- oder Remote-Support nach Produktivstart)

---

## 8. Ausschlusskriterien (K.O.-Kriterien)

Folgende Punkte führen zur sofortigen Ablehnung des Systems:

| # | K.O.-Kriterium |
|---|---|
| 1 | Datenhaltung außerhalb der EU |
| 2 | Kein vollständiger Datenexport möglich (Vendor Lock-in) |
| 3 | Fehlende XBau- oder OZG-Schnittstelle |
| 4 | Keine Mandantentrennung bei Mehrmandantenfähigkeit |
| 5 | Kein deutschsprachiger Support mit Telefon-Erreichbarkeit |
| 6 | SLA ohne verbindliche Reaktions- und Lösungszeiten |
| 7 | Keine Testumgebung verfügbar |
| 8 | Gebührenberechnung nicht an Landesrecht anpassbar |

---

*Dokument erstellt auf Basis praktischer Erfahrung in der unteren Bauaufsichtsbehörde. Alle Anforderungen sind vor Vertragsabschluss mit dem Anbieter schriftlich zu bestätigen.*
