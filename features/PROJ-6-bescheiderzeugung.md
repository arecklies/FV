# PROJ-6: Bescheiderzeugung mit Textbausteinen

**Status:** Planned | **Phase:** 1 (Kern-MVP) | **Erstellt:** 2026-03-25

---

## 1. Ziel / Problem

Bescheide sind das primaere Arbeitsergebnis der Bauaufsicht. Aktuell werden sie haendisch in Word erstellt. Das System soll Textbausteine, automatische Befuellung und PDF/A-Erzeugung bieten. Behoerden muessen Textbausteine selbst pflegen koennen (K.O.-nah: "Konfigurierbarkeit ohne Anbieter").

## 2. Fachlicher Kontext & Stakeholder

- **P1:** Durchsuchbare Textbausteinbibliothek, je Verfahrensart filterbar, behoerdenseitig pflegbar
- **P2:** Vorlagen die automatisch befuellt werden, "Rad nicht neu erfinden"
- **P3:** Konfigurierbarkeit ohne Anbieter-Ticket (kein kostenpflichtiges Customizing)

## 3. Funktionale Anforderungen

- FA-1: Textbausteinbibliothek (DB-Tabelle `text_bausteine`) mit Kategorien, Verfahrensart-Filter, Volltext-Suche
- FA-2: Textbausteine durch Behoerden-Admins pflegbar (CRUD-UI)
- FA-3: Bescheid-Vorlagen mit Platzhaltern (Aktenzeichen, Adresse, Antragsteller, Fristen, Nebenbestimmungen)
- FA-4: Automatische Befuellung der Platzhalter aus Vorgangsdaten
- FA-5: Nebenbestimmungen aus Baustein-Bibliothek zusammenstellen
- FA-6: PDF/A-Erzeugung des fertigen Bescheids
- FA-7: Versandweg-Auswahl (initial: PDF-Download, spaeter: E-Mail, De-Mail)

## 4. User Stories & Akzeptanzkriterien

### US-1: Bescheid erstellen
Als Sachbearbeiter moechte ich einen Bescheid aus Textbausteinen zusammenstellen.
- AC-1: Auswahl Bescheidtyp (Genehmigung, Ablehnung, Vorbescheid, etc.)
- AC-2: Vorschlag passender Textbausteine basierend auf Verfahrensart
- AC-3: Platzhalter werden automatisch mit Vorgangsdaten befuellt
- AC-4: Nebenbestimmungen hinzufuegen aus Bibliothek
- AC-5: Vorschau vor PDF-Erzeugung

### US-2: Textbausteine pflegen
Als Behoerden-Admin moechte ich Textbausteine selbst anlegen und aendern.
- AC-1: CRUD-Oberflaeche fuer Textbausteine
- AC-2: Kategorisierung und Verfahrensart-Zuordnung
- AC-3: Keine Entwickler-Hilfe noetig

### US-3: PDF/A erzeugen
Als Sachbearbeiter moechte ich den fertigen Bescheid als PDF/A herunterladen.
- AC-1: PDF/A-konformes Dokument mit Briefkopf/Layout
- AC-2: Dokument wird automatisch dem Vorgang zugeordnet
- AC-3: Erzeugung in Audit-Trail protokolliert

## 5. Nicht-funktionale Anforderungen

- NFR-1: PDF-Erzeugung < 5 Sekunden
- NFR-2: PDF/A fuer revisionssichere Archivierung
- NFR-3: Textbausteine mandantenfaehig (je Tenant eigene Bausteine)

## 6. Spezialisten-Trigger

- **Backend Developer:** BescheidService, PDF-Generierung, Textbaustein-API
- **Frontend Developer:** Bescheid-Editor, Baustein-Browser, Vorschau
- **UI/UX Designer:** Editor-UX, Baustein-Auswahl, Vorschau-Layout

## 7. Offene Fragen

1. PDF-Bibliothek: puppeteer, react-pdf, oder HTML-to-PDF-Dienst?
2. Briefkopf/Layout: Je Behoerde konfigurierbar oder Standard?
3. Qualifizierte Signatur: In diesem Feature oder eigenes Feature (PROJ-9+)?

## 8. Annahmen

- Qualifizierte elektronische Signatur kommt in Phase 2 (nicht im MVP)
- PDF-Erzeugung serverseitig (nicht im Browser)
- Briefkopf ist initial ein Standard-Template, spaeter mandantenspezifisch

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-3 (Vorgangsverwaltung) | Bescheid gehoert zu Vorgang |
| PROJ-5 (Dokumentenverwaltung) | Erzeugter Bescheid wird als Dokument abgelegt |
| ADR-003 (Service-Architektur) | BescheidService |
| ADR-006 (Rechtskonfiguration) | Textbausteine als DB-Datensaetze |

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| PDF-Layout nicht akzeptabel fuer Behoerde | Mittel | Ablehnung | Fruehes Layout-Review mit P1 |
| Textbausteine unvollstaendig bei Go-Live | Hoch | SB erstellen Bescheide manuell | Migrationsskript fuer bestehende Bausteine |
| PDF/A-Konformitaet nicht gegeben | Niedrig | Archivierung scheitert | Validierung gegen PDF/A-Standard |
