# PROJ-6: Bescheiderzeugung mit Textbausteinen

**Status:** In Progress | **Phase:** 1 (Kern-MVP) | **Erstellt:** 2026-03-25
**Letzte Verfeinerung:** 2026-03-29 (req-stories: 5 US verfeinert, Workflow-Integration, Vorschau-Story ergaenzt)

---

## 1. Ziel / Problem

Bescheide sind das primaere Arbeitsergebnis der Bauaufsicht. Aktuell werden sie haendisch in Word erstellt. Das System soll Textbausteine, automatische Befuellung und PDF/A-Erzeugung bieten. Behoerden muessen Textbausteine selbst pflegen koennen (K.O.-nah: "Konfigurierbarkeit ohne Anbieter").

## 2. Fachlicher Kontext & Stakeholder

- **P1:** Durchsuchbare Textbausteinbibliothek, je Verfahrensart filterbar, behoerdenseitig pflegbar
- **P2:** Vorlagen die automatisch befuellt werden, "Rad nicht neu erfinden"
- **P3:** Konfigurierbarkeit ohne Anbieter-Ticket (kein kostenpflichtiges Customizing)
- **ADR-010:** PDF-Generierung und Bescheid-Rendering (Puppeteer lokal, HTML-Templates, PDF/A-Konvertierung)
- **ADR-011:** Bescheiderstellung ist Workflow-Schritt `bescheid_entwurf`, Freizeichnung ist Schritt `freizeichnung` (typ: "freigabe", minRolle: referatsleiter)

## 3. Funktionale Anforderungen

- FA-1: Textbausteinbibliothek (DB-Tabelle `text_bausteine`) mit Kategorien, Verfahrensart-Filter, Volltext-Suche
- FA-2: Textbausteine durch Behoerden-Admins pflegbar (CRUD-UI)
- FA-3: Bescheid-Vorlagen mit Platzhaltern (Aktenzeichen, Adresse, Antragsteller, Fristen, Nebenbestimmungen)
- FA-4: Automatische Befuellung der Platzhalter aus Vorgangsdaten
- FA-5: Nebenbestimmungen aus Baustein-Bibliothek zusammenstellen
- FA-6: PDF/A-Erzeugung des fertigen Bescheids (ADR-010: Puppeteer + HTML-Templates, Background Job via ADR-008)
- FA-7: Versandweg-Auswahl (initial: PDF-Download, spaeter: E-Mail, De-Mail)
- FA-8: Workflow-Integration: Bescheid erstellen loest Workflow-Schritt `bescheid_entwurf` aus, Freigabe durch Referatsleiter (ADR-011 `freizeichnung`)

## 4. User Stories & Akzeptanzkriterien

### MVP-Scope-Pruefung
5 Stories. US-5 (Workflow-Integration) koennte in US-4 integriert werden, hat aber eigene UI-Logik (Button-Zustand, Validierung). Kein Split in separate Items noetig.

### US-1: Bescheid aus Textbausteinen zusammenstellen
**Als** Sachbearbeiter **moechte ich** einen Bescheid aus vordefinierten Textbausteinen zusammenstellen.
- AC-1: Button "Bescheid erstellen" im Workflow-Schritt `bescheid_entwurf`
- AC-2: Bescheidtyp-Auswahl: Genehmigung, Ablehnung, Vorbescheid, Teilgenehmigung
- AC-3: System schlaegt passende Bausteine vor (Verfahrensart + Bescheidtyp), gruppiert nach Kategorie (Einleitung, Tenor, Nebenbestimmungen, Begruendung, Rechtsbehelfsbelehrung)
- AC-4: Bausteine per Klick hinzufuegen/entfernen, Reihenfolge aenderbar (Drag-and-Drop oder Pfeile)
- AC-5: Platzhalter (`{{aktenzeichen}}`, `{{antragsteller}}` etc.) automatisch aus Vorgangsdaten befuellt. Nicht befuellbare rot hervorgehoben
- AC-6: Nebenbestimmungen einzeln aus Bibliothek hinzufuegen, automatisch nummeriert
- AC-7: Auto-Save des Bescheid-Entwurfs (kein Datenverlust bei Verbindungsabbruch)
- AC-8: Loading-, Error- und Empty-States

### US-2: Textbausteine pflegen (Behoerden-Admin)
**Als** Behoerden-Admin **moechte ich** Textbausteine selbst anlegen und aendern.
- AC-1: CRUD-Oberflaeche nur fuer Rolle >= `tenant_admin`
- AC-2: Felder: Titel, Kategorie (6 Typen), Verfahrensart-Zuordnung (Mehrfach), Bescheidtyp-Zuordnung (Mehrfach), Inhalt mit Platzhalter-Syntax
- AC-3: Mandantenfaehig: Tenant sieht nur eigene Bausteine (RLS)
- AC-4: Verfuegbare Platzhalter als Hilfe angezeigt
- AC-5: Soft-Delete (inaktiv markieren, nicht loeschen)
- AC-6: Volltextsuche ueber Bausteine (Titel + Inhalt)
- AC-7: Loading-, Error- und Empty-States

### US-3: Bescheid-Vorschau anzeigen
**Als** Sachbearbeiter **moechte ich** vor der PDF-Erzeugung eine Vorschau sehen.
- AC-1: Button "Vorschau" zeigt HTML-Vorschau (gleiches Template wie PDF)
- AC-2: Vorschau zeigt Briefkopf-Layout (Behoerdenname, Anschrift, Aktenzeichen, Datum)
- AC-3: Nicht befuellte Platzhalter rot hervorgehoben. "PDF erzeugen" nur mit Bestaetigung bei offenen Platzhaltern
- AC-4: Vorschau-Rendering < 2 Sekunden

### US-4: PDF/A erzeugen und ablegen
**Als** Sachbearbeiter **moechte ich** den fertigen Bescheid als PDF/A erzeugen.
- AC-1: Button "PDF erzeugen" startet Background Job (ADR-008), Fortschrittsindikator
- AC-2: PDF ist PDF/A-konform (Puppeteer + pdf-lib/ghostscript, ADR-010)
- AC-3: Inhalt: Briefkopf, Bescheidtyp, Tenor, Nebenbestimmungen, Begruendung, Rechtsbehelfsbelehrung
- AC-4: PDF automatisch dem Vorgang als Dokument zugeordnet (PROJ-5, Kategorie "Bescheide")
- AC-5: Sofort-Download nach Erzeugung
- AC-6: Audit-Trail: Wer, Wann, Welcher Vorgang, Bescheidtyp
- AC-7: Bei Fehler: Error-Toast, kein inkonsistenter Zustand
- AC-8: PDF-Erzeugung < 5 Sekunden

### US-5: Workflow-Integration (Freigabe anfordern)
**Als** Sachbearbeiter **moechte ich** nach Bescheiderstellung direkt die Freigabe anfordern.
- AC-1: Im Schritt `bescheid_entwurf` zeigt die Seite den Bescheid-Editor statt leerem Schritt
- AC-2: Nach PDF-Erzeugung wird "Freigabe anfordern" automatisch angeboten
- AC-3: Transition `bescheid_entwurf` → `freizeichnung` nur wenn mindestens ein PDF erzeugt wurde
- AC-4: Nutzt bestehenden `executeWorkflowAktion()`-Mechanismus
- AC-5: Referatsleiter sieht im Schritt `freizeichnung` Link zum erzeugten PDF

## 5. Nicht-funktionale Anforderungen

- NFR-1: PDF-Erzeugung < 5 Sekunden (Gesamtzeit inkl. Background Job)
- NFR-2: PDF/A fuer revisionssichere Archivierung
- NFR-3: Textbausteine mandantenfaehig (je Tenant eigene Bausteine, RLS)

## 6. Spezialisten-Trigger

- **Database Architect:** Tabellen `text_bausteine` + `vorgang_bescheide`, RLS, Indizes
- **Backend Developer:** BescheidService, Platzhalter-Engine, PDF-Renderer (ADR-010), Background Job (ADR-008)
- **Frontend Developer:** Bescheid-Editor (Drag-and-Drop), Vorschau, Admin-CRUD Textbausteine
- **UI/UX Designer:** Editor-UX, Baustein-Auswahl, Vorschau-Layout, Briefkopf-Template
- **Security Engineer:** RLS auf `text_bausteine`/`vorgang_bescheide`, Audit-Trail PDF-Erzeugung
- **DevOps Engineer:** Puppeteer-Chromium in Docker, Background Job Worker

## 7. Offene Fragen

1. **[Requirements]** Platzhalter-Katalog: Welche Felder als `{{...}}` verfuegbar? Minimum: aktenzeichen, antragsteller, bauvorhaben_adresse, verfahrensart, datum
2. **[Fachberater]** Rechtsbehelfsbelehrung pro Bundesland unterschiedlich? → BL-spezifischer Textbaustein?
3. **[Architekt]** Bescheid-Entwurf-Persistenz: eigene Tabelle `vorgang_bescheide` oder JSON im Vorgang?
4. **[Fachberater]** Mehrere Bescheide pro Vorgang (Nachtrag, Aenderungsbescheid)? → Annahme: ja, aber 1 aktiver Entwurf
5. ~~PDF-Bibliothek~~ **Geklaert:** ADR-010: Puppeteer lokal (MVP)
6. ~~Qualifizierte Signatur~~ Phase 2, nicht MVP

## 8. Annahmen

- Qualifizierte elektronische Signatur kommt in Phase 2 (nicht im MVP)
- PDF-Erzeugung serverseitig via Puppeteer (ADR-010)
- Briefkopf ist initial ein Standard-Template, spaeter mandantenspezifisch
- Bescheiderstellung ist Teil des Workflow-Prozesses (ADR-011)
- PROJ-5 (Dokumentenverwaltung) wird vor oder parallel implementiert (mindestens Ablage-API)
- Platzhalter-Syntax: `{{feldname}}` (Handlebars-kompatibel)
- Initiale Textbausteine als DB-Seed (NRW Genehmigung, Ablehnung, Rechtsbehelfsbelehrung)
- Gleicher Editor fuer `bescheid_entwurf` und `ablehnung_entwurf` (Bescheidtyp vorausgewaehlt)

## 11. Scope / Nicht-Scope

**Scope:** Bescheid aus Textbausteinen, Platzhalter-Befuellung, Nebenbestimmungen, PDF/A-Erzeugung (Background Job), Workflow-Integration, Textbaustein-CRUD (Admin), Vorschau, Standard-Briefkopf
**Nicht-Scope:** Qualifizierte elektronische Signatur (Phase 2), mandantenspezifische Briefkoepfe (Post-MVP), Versandweg-Auswahl (E-Mail/De-Mail), WYSIWYG-Editor, Gotenberg/Cloud-PDF (ADR-010 MVP: Puppeteer lokal)

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-3 (Vorgangsverwaltung) | Bescheid gehoert zu Vorgang |
| PROJ-5 (Dokumentenverwaltung) | Erzeugter Bescheid wird als Dokument abgelegt |
| ADR-003 (Service-Architektur) | BescheidService |
| ADR-006 (Rechtskonfiguration) | Textbausteine als DB-Datensaetze |
| ADR-010 (PDF-Generierung) | Puppeteer, HTML-Templates, PDF/A |
| ADR-011 (Workflow Engine) | Schritte `bescheid_entwurf` und `freizeichnung` |
| ADR-008 (Background Jobs) | PDF-Erzeugung als Background Job |

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| PDF-Layout nicht akzeptabel fuer Behoerde | Mittel | Ablehnung | Fruehes Layout-Review mit P1 |
| Textbausteine unvollstaendig bei Go-Live | Hoch | SB erstellen Bescheide manuell | Migrationsskript fuer bestehende Bausteine |
| PDF/A-Konformitaet nicht gegeben | Niedrig | Archivierung scheitert | Validierung gegen PDF/A-Standard |
