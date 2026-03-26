# PROJ-3: Vorgangsverwaltung

**Status:** Planned | **Phase:** 1 (Kern-MVP) | **Erstellt:** 2026-03-25
**Letzte Verfeinerung:** 2026-03-26 (req-refine: ADR-011 integriert, fehlende Stories ergaenzt, Workflow-Definition als Deliverable, Querschnitts-NFRs)

---

## 1. Ziel / Problem

Die Vorgangsverwaltung ist das zentrale Fachmodul: Bauverfahren anlegen, bearbeiten, Status verfolgen. Ohne dieses Modul existiert kein Fachverfahren. Der erfahrene Sachbearbeiter (P1) fordert alle gaengigen Genehmigungsverfahren, der Einsteiger (P2) eine uebersichtliche Vorgangsliste mit klaren Status-Anzeigen und gefuehrte Bearbeitung (ADR-011).

## 2. Fachlicher Kontext & Stakeholder

- **P1:** Vollstaendiges Verfahrensspektrum (Baugenehmigung regulaer/vereinfacht/Freistellung, Vorbescheid, Nutzungsaenderung, Abbruch). Flexibler Experten-Modus (Schritte ueberspringen mit Begruendung).
- **P2:** Uebersichtliche Vorgangsliste, klare Statusanzeigen, gefuehrter Prozess mit Hinweistexten und Checklisten (Einsteiger-Modus, ADR-011)
- **P3:** Vorgangsumzuweisung, Vertretungsregelung, Wiedervorlagen-Monitoring
- **ADR-003:** VerfahrenService unter `src/lib/services/verfahren/`
- **ADR-006:** Verfahrensarten als konfigurierbare Datensaetze je Bundesland
- **ADR-011:** Workflow Engine -- datengetriebene State Machine mit JSON-Workflow-Definitionen pro Verfahrensart und Bundesland

## 3. Funktionale Anforderungen

- FA-1: Vorgang anlegen (Verfahrensart, Bauherr, Grundstueck, Bezeichnung)
- FA-2: Konfigurierbare Verfahrensarten je Bundesland (aus `config_verfahrensarten`)
- FA-3: Status-Workflow ueber Workflow Engine (ADR-011): JSON-basierte State Machine mit konfigurierbaren Schritten, Uebergaengen, Hinweistexten und Checklisten pro Verfahrensart und Bundesland. Workflow-Definitionen in `config_workflows`.
- FA-4: Konfigurierbares Aktenzeichen-Schema (Jahrgang/Laufnummer/Verfahrenskuerzel)
- FA-5: Vorgangsliste mit Sortierung, Filterung, Paginierung
- FA-6: Globale Suche ueber Aktenzeichen, Adresse, Name, Flurstueck, Status
- FA-7: Vorgangsumzuweisung an anderen Sachbearbeiter (mit Benachrichtigung)
- FA-8: Wiedervorlagen mit Datum und Notiz
- FA-9: Interne Kommentare/Notizen pro Vorgang
- FA-10: Parallele Bearbeitung (mehrere SB am selben Vorgang mit Aenderungsprotokoll, Optimistic Locking)
- FA-11: Massenoperationen auf der Vorgangsliste (Status aendern, Zuweisen, Fristverschiebung fuer mehrere Vorgaenge gleichzeitig) -- Umfrage: 64 Votes, Rang 3 der Freitext-Anforderungen
- FA-12: Zwei UX-Modi gemaess ADR-011: Einsteiger-Modus (gefuehrter Prozess mit Hinweisen, Checklisten, Aktionsbuttons) und Experten-Modus (flexibel, Schritte ueberspringbar mit Begruendungspflicht)
- FA-13: Auto-Save fuer Formulareingaben (localStorage/sessionStorage) -- Querschnitts-NFR aus frontend.md

## 4. User Stories & Akzeptanzkriterien

### US-1: Vorgang anlegen
Als Sachbearbeiter moechte ich einen neuen Bauantrag als Vorgang anlegen.
- AC-1: Auswahl Verfahrensart aus konfigurierbarer Liste (Progressive Disclosure: Top 6 sichtbar, Rest hinter "Weitere")
- AC-2: Pflichtfelder: Verfahrensart, Bauherr (Name), Grundstueck (Adresse oder Flurstueck)
- AC-3: Aktenzeichen wird automatisch nach Schema vergeben
- AC-4: Nach Anlage: Vorgang in Vorgangsliste sichtbar
- AC-5: Workflow-Definition wird automatisch geladen (aus config_workflows fuer Verfahrensart + Bundesland)
- AC-6: Initialstatus "eingegangen" wird gesetzt, Fristen werden berechnet (PROJ-4)

### US-2: Vorgangsliste
Als Sachbearbeiter moechte ich meine offenen Vorgaenge auf einen Blick sehen.
- AC-1: Liste zeigt: Aktenzeichen, Adresse, Status, Frist-Ampel, Zustaendiger
- AC-2: Filterbar nach Status, Verfahrensart, Zeitraum
- AC-3: Sortierbar nach Frist, Eingangsdatum, Aktenzeichen
- AC-4: Suche findet Vorgaenge in < 2 Sekunden
- AC-5: Tastaturnavigation: Pfeiltasten in Liste, Ctrl+K fuer globale Suche, Ctrl+N fuer neuen Vorgang (Querschnitts-NFR)

### US-3: Vorgang uebergeben
Als Sachbearbeiter moechte ich einen Vorgang an eine Kollegin uebergeben (Urlaub/Krankheit).
- AC-1: Uebergabe-Funktion in Vorgangsdetail
- AC-2: Neuer Bearbeiter wird benachrichtigt
- AC-3: Fristen und Wiedervorlagen bleiben erhalten
- AC-4: Uebergabe im Audit-Log protokolliert

### US-4: Interne Kommentare
Als Sachbearbeiter moechte ich interne Notizen zu einem Vorgang hinterlassen.
- AC-1: Kommentarfeld in Vorgangsdetail
- AC-2: Kommentare chronologisch sortiert mit Autor und Zeitstempel
- AC-3: Kommentare sind nur innerhalb des Mandanten sichtbar (RLS)
- AC-4: Kein Loeschen von Kommentaren (Revisionssicherheit)

### US-5: Parallele Bearbeitung
Als Sachbearbeiter moechte ich an einem Vorgang arbeiten koennen, auch wenn eine Kollegin gleichzeitig daran arbeitet.
- AC-1: Optimistic Locking: Bei Speichern wird geprueft ob zwischenzeitlich geaendert wurde
- AC-2: Bei Konflikt: Hinweis "Vorgang wurde zwischenzeitlich geaendert" mit Diff-Anzeige
- AC-3: Aenderungsprotokoll zeigt wer wann was geaendert hat

### US-6: Massenoperationen
Als Sachbearbeiter moechte ich mehrere Vorgaenge gleichzeitig bearbeiten (z.B. Status aendern, zuweisen).
- AC-1: Checkboxen in Vorgangsliste fuer Mehrfachauswahl
- AC-2: Sammelaktionen: Status aendern, Zuweisen, Frist verschieben
- AC-3: Bestaetigung vor Ausfuehrung (z.B. "3 Vorgaenge zuweisen an Max Mustermann?")
- AC-4: Ergebnisanzeige: Wie viele erfolgreich, wie viele fehlgeschlagen

### US-7: Gefuehrter Prozess (Einsteiger-Modus)
Als Berufseinsteiger moechte ich bei jedem Vorgang sehen, was als Naechstes zu tun ist.
- AC-1: Hinweistext erklaert den aktuellen Bearbeitungsschritt
- AC-2: Checkliste zeigt Pflichtunterlagen/-pruefungen fuer den aktuellen Schritt
- AC-3: Aktionsbuttons sind die einzigen erlaubten naechsten Schritte
- AC-4: Prozessfortschritt als Stepper-Visualisierung (ADR-011)

## 5. Nicht-funktionale Anforderungen

- NFR-1: Seitenaufbau Vorgangsliste < 2 Sekunden bei 50 Mbit/s
- NFR-2: Gleichzeitige Nutzung >= 50 SB ohne Leistungseinbusse
- NFR-3: Mandantentrennung (RLS) auf Vorgangstabelle und allen Unter-Tabellen
- NFR-4: `.limit()` auf alle Listenqueries
- NFR-5: WCAG 2.2 AA, vollstaendige Tastaturnavigation
- NFR-6: Auto-Save bei Formulareingaben (kein Datenverlust bei Verbindungsabbruch)

## 6. Spezialisten-Trigger

- **Database Architect:** Vorgang-Schema, Workflow-Schritte-Tabelle, Aktenzeichen-Generierung, Indizes
- **UI/UX Designer:** Vorgangsliste, Progressive Disclosure, Stepper-Visualisierung, Einsteiger- vs. Experten-Modus
- **Frontend Developer:** Vorgangsliste-Komponente, Suche, Filter, Stepper, Massenoperationen
- **Backend Developer:** VerfahrenService, WorkflowService (ADR-011), API-Routes
- **Requirements Engineer:** Workflow-Definitionen (JSON) fuer mindestens 3 Verfahrensarten aus LBO-Quelldokumenten (ADR-011)

## 7. Offene Fragen

1. ~~Welche Status-Uebergaenge sind je Verfahrensart erlaubt?~~ **Geklaert:** ADR-011 definiert Workflow-Definitionen als JSON in config_workflows. RE liefert JSON-Entwuerfe aus LBO-Quelldokumenten.
2. Wie wird Parallelbearbeitung technisch geloest? **Entscheidung:** Optimistic Locking via `updated_at`-Vergleich.
3. Soll die Suche Volltextsuche ueber Kommentare einschliessen? (Offen)

## 8. Annahmen

- Verfahrensarten sind konfigurierbar je Bundesland (ADR-006). Alle 16 LBOs werden architektonisch unterstuetzt. Initiale Konfiguration fuer alle BL, die als PDF-Quelldokumente unter Input/ vorliegen.
- Status-Workflow ist konfigurierbar ueber JSON-Definitionen in config_workflows (ADR-011)
- Suche nutzt PostgreSQL tsvector/tsquery (kein externer Suchindex)
- MVP: Workflow-Definitionen fuer 3 Verfahrensarten (Baugenehmigung regulaer, vereinfacht, Freistellung)

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-1 (Auth) + PROJ-2 (RLS) | Voraussetzung |
| ADR-003 (Service-Architektur) | VerfahrenService |
| ADR-006 (Rechtskonfiguration) | config_verfahrensarten |
| ADR-011 (Workflow Engine) | WorkflowService, config_workflows, Einsteiger-/Experten-Modus |
| ADR-012 (Vorgang-Datenmodell) | Schema fuer vorgaenge und Unter-Tabellen (noch zu erstellen) |
| PROJ-4 (Fristmanagement) | Parallel, Frist-Ampel in Liste |

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Workflow-Modell zu rigide fuer Praxis | Mittel | SB koennen Status nicht aendern | Experten-Modus mit Ueberspringen (ADR-011) |
| Suche zu langsam bei vielen Vorgaengen | Niedrig | Nutzerfrust | Indizes, tsvector, Paginierung |
| Parallelbearbeitung fuehrt zu Konflikten | Mittel | Datenverlust | Optimistic Locking mit Konfliktanzeige |
| Workflow-Definitionen fuer 16 BL aufwaendig | Hoch | Verzoegerung | MVP: 3 Verfahrensarten NRW, dann schrittweise |
