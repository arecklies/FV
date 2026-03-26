# PROJ-3: Vorgangsverwaltung

**Status:** Planned | **Phase:** 1 (Kern-MVP) | **Erstellt:** 2026-03-25

---

## 1. Ziel / Problem

Die Vorgangsverwaltung ist das zentrale Fachmodul: Bauverfahren anlegen, bearbeiten, Status verfolgen. Ohne dieses Modul existiert kein Fachverfahren. Der erfahrene Sachbearbeiter (P1) fordert alle gaengigen Genehmigungsverfahren, der Einsteiger (P2) eine uebersichtliche Vorgangsliste mit klaren Status-Anzeigen.

## 2. Fachlicher Kontext & Stakeholder

- **P1:** Vollstaendiges Verfahrensspektrum (Baugenehmigung regulaer/vereinfacht/Freistellung, Vorbescheid, Nutzungsaenderung, Abbruch)
- **P2:** Uebersichtliche Vorgangsliste, klare Statusanzeigen, To-Do-Ansicht
- **P3:** Vorgangsumzuweisung, Vertretungsregelung, Wiedervorlagen-Monitoring
- **ADR-003:** VerfahrenService unter `src/lib/services/verfahren/`
- **ADR-006:** Verfahrensarten als konfigurierbare Datensaetze je Bundesland

## 3. Funktionale Anforderungen

- FA-1: Vorgang anlegen (Verfahrensart, Bauherr, Grundstueck, Bezeichnung)
- FA-2: Konfigurierbare Verfahrensarten je Bundesland (aus `config_verfahrensarten`)
- FA-3: Status-Workflow mit definierten Uebergaengen (Eingang -> Pruefung -> Beteiligung -> Bescheid -> Abschluss)
- FA-4: Konfigurierbares Aktenzeichen-Schema (Jahrgang/Laufnummer/Verfahrenskuerzel)
- FA-5: Vorgangsliste mit Sortierung, Filterung, Paginierung
- FA-6: Globale Suche ueber Aktenzeichen, Adresse, Name, Flurstueck, Status
- FA-7: Vorgangsumzuweisung an anderen Sachbearbeiter (mit Benachrichtigung)
- FA-8: Wiedervorlagen mit Datum und Notiz
- FA-9: Interne Kommentare/Notizen pro Vorgang
- FA-10: Parallele Bearbeitung (mehrere SB am selben Vorgang mit Aenderungsprotokoll)
- FA-11: Massenoperationen auf der Vorgangsliste (Status aendern, Zuweisen, Fristverschiebung fuer mehrere Vorgaenge gleichzeitig) -- Umfrage: 64 Votes, Rang 3 der Freitext-Anforderungen

## 4. User Stories & Akzeptanzkriterien

### US-1: Vorgang anlegen
Als Sachbearbeiter moechte ich einen neuen Bauantrag als Vorgang anlegen.
- AC-1: Auswahl Verfahrensart aus konfigurierbarer Liste (Progressive Disclosure: Top 6 sichtbar, Rest hinter "Weitere")
- AC-2: Pflichtfelder: Verfahrensart, Bauherr (Name), Grundstueck (Adresse oder Flurstueck)
- AC-3: Aktenzeichen wird automatisch nach Schema vergeben
- AC-4: Nach Anlage: Vorgang in Vorgangsliste sichtbar

### US-2: Vorgangsliste
Als Sachbearbeiter moechte ich meine offenen Vorgaenge auf einen Blick sehen.
- AC-1: Liste zeigt: Aktenzeichen, Adresse, Status, Frist-Ampel, Zustaendiger
- AC-2: Filterbar nach Status, Verfahrensart, Zeitraum
- AC-3: Sortierbar nach Frist, Eingangsdatum, Aktenzeichen
- AC-4: Suche findet Vorgaenge in < 2 Sekunden

### US-3: Vorgang uebergeben
Als Sachbearbeiter moechte ich einen Vorgang an eine Kollegin uebergeben (Urlaub/Krankheit).
- AC-1: Uebergabe-Funktion in Vorgangsdetail
- AC-2: Neuer Bearbeiter wird benachrichtigt
- AC-3: Fristen und Wiedervorlagen bleiben erhalten

## 5. Nicht-funktionale Anforderungen

- NFR-1: Seitenaufbau Vorgangsliste < 2 Sekunden bei 50 Mbit/s
- NFR-2: Gleichzeitige Nutzung >= 50 SB ohne Leistungseinbusse
- NFR-3: Mandantentrennung (RLS) auf Vorgangstabelle
- NFR-4: `.limit()` auf alle Listenqueries
- NFR-5: WCAG 2.2 AA, vollstaendige Tastaturnavigation

## 6. Spezialisten-Trigger

- **Database Architect:** Verfahrens-Schema, Status-Modell, Indizes
- **UI/UX Designer:** Vorgangsliste, Progressive Disclosure, Dashboard
- **Frontend Developer:** Vorgangsliste-Komponente, Suche, Filter
- **Backend Developer:** VerfahrenService, API-Routes

## 7. Offene Fragen

1. Welche Status-Uebergaenge sind je Verfahrensart erlaubt? (Workflow-Modell)
2. Wie wird Parallelbearbeitung technisch geloest (Optimistic Locking)?
3. Soll die Suche Volltextsuche ueber Kommentare einschliessen?

## 8. Annahmen

- Verfahrensarten sind konfigurierbar je Bundesland (ADR-006). Alle 16 LBOs werden architektonisch unterstuetzt. Initiale Konfiguration fuer alle BL, die als PDF-Quelldokumente unter Input/ vorliegen.
- Status-Workflow ist konfigurierbar, aber Initial fest definiert
- Suche nutzt PostgreSQL tsvector/tsquery (kein externer Suchindex)

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-1 (Auth) + PROJ-2 (RLS) | Voraussetzung |
| ADR-003 (Service-Architektur) | VerfahrenService |
| ADR-006 (Rechtskonfiguration) | config_verfahrensarten |
| PROJ-4 (Fristmanagement) | Parallel, Frist-Ampel in Liste |

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Workflow-Modell zu rigide fuer Praxis | Mittel | SB koennen Status nicht aendern | Konfigurierbare Uebergaenge, Ausnahme-Option |
| Suche zu langsam bei vielen Vorgaengen | Niedrig | Nutzerfrust | Indizes, tsvector, Paginierung |
| Parallelbearbeitung fuehrt zu Konflikten | Mittel | Datenverlust | Optimistic Locking mit Konfliktanzeige |
