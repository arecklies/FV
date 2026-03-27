# PROJ-44: LBO Baden-Württemberg Regelwerk-Konfiguration

**Status:** Deployed | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-28
**Herkunft:** Kunden-Session 28.03.2026, F-03 (Herr Yilmaz, Freiburg, P1)
**Prioritaet:** Hoch (Pilotblocker Freiburg)

---

## 1. Ziel / Problem

Freiburg (Baden-Württemberg) ist der erste Nicht-NRW-Pilotkandidat. Die LBO BW definiert andere Verfahrenstypen als NRW — insbesondere das Kenntnisgabeverfahren nach § 51 LBO BW, das in NRW nicht existiert. Ohne LBO-BW-Konfiguration kann Freiburg das System nicht nutzen. Die Architektur (ADR-006 Regelwerk-Engine) ist auf Multi-BL ausgelegt, die konkreten BW-Daten fehlen.

## 2. Fachlicher Kontext & Stakeholder

- **P1 (Erfahrener SB, Freiburg):** "Wir haben das Kenntnisgabeverfahren nach § 51 — das gibt es bei NRW nicht"
- **P4 (Amtsleiterin, Freiburg):** Erster Multi-BL-Beweis strategisch wichtig
- **ADR-006:** Rechtskonfiguration als Daten (Regelwerk-Engine)
- **PRD:** "Alle 16 LBOs architektonisch unterstuetzen"

### Rechtsgrundlage

LBO Baden-Wuerttemberg in der Fassung vom 5. Maerz 2010, letzte Aenderung vom 18.03.2025 (gueltig ab 28.06.2025). Quelle: `Input/Gesetzte/LBOs/Baden-Wuerttemberg.pdf`

### Verfahrensarten LBO BW (Achter Teil, §§ 49-62)

| Verfahrensart | Paragraph | Anwendungsbereich |
|---|---|---|
| Kenntnisgabeverfahren | § 51 LBO BW | Wohngebaeude, sonstige Gebaeude GK 1-3 (keine Sonderbauten), im Geltungsbereich eines B-Plans nach § 30 Abs. 1 BauGB |
| Vereinfachtes Baugenehmigungsverfahren | § 52 LBO BW | Alle Vorhaben ausser Sonderbauten; bei Wohngebaeuden GK 1-4 einzig neben Kenntnisgabe moeglich |
| Baugenehmigungsverfahren (regulaer) | §§ 49, 58 LBO BW | Sonderbauten und alle nicht durch § 50-52 abgedeckten Vorhaben |
| Bauvorbescheid | § 57 LBO BW | Vorab-Klaerung einzelner Fragen vor Bauantrag |

### Fristen LBO BW (§ 54)

| Frist | Dauer | Rechtsgrundlage |
|---|---|---|
| Vollstaendigkeitspruefung | 10 Arbeitstage | § 54 Abs. 1 LBO BW |
| Stellungnahmen Gemeinde/ToEB | max. 1 Monat (= 20 WT) | § 54 Abs. 3 LBO BW |
| Entscheidungsfrist regulaer | 2 Monate (= 40 WT) | § 54 Abs. 5 Satz 1 LBO BW |
| Entscheidungsfrist vereinfacht/Vorbescheid | 1 Monat (= 20 WT) | § 54 Abs. 5 Satz 1 LBO BW |
| Kenntnisgabe Baubeginn-Frist | 2 Wochen (= 10 WT) | § 59 Abs. 4 LBO BW |
| Eingangsbestaetigung Kenntnisgabe | 5 Arbeitstage | § 53 Abs. 5 LBO BW |

### Gebaeueklassen BW (§ 2 Abs. 4)

Identisch mit MBO: GK 1-5. Hoehe = Fussbodenoberkante hoechstgelegenes Geschoss mit moeglichem Aufenthaltsraum ueber mittlerer Gelaendeoberflaeche.

| GK | Definition |
|---|---|
| 1 | Freistehend, Hoehe <= 7 m, <= 2 NE, <= 400 m², freistehende Land-/Forstwirtschaft |
| 2 | Hoehe <= 7 m, <= 2 NE, <= 400 m² (nicht freistehend) |
| 3 | Sonstige Gebaeude, Hoehe <= 7 m |
| 4 | Hoehe <= 13 m, NE jeweils <= 400 m² |
| 5 | Sonstige Gebaeude inkl. unterirdische |

## 3. Funktionale Anforderungen

- FA-1: Verfahrensarten BW in `config_verfahrensarten` konfigurieren (4 Verfahrensarten)
- FA-2: Gesetzliche Fristen BW in `config_fristen` konfigurieren (je Verfahrensart)
- FA-3: Gebaeueklassen BW in Regelwerk-Dateien (identisch MBO, Validierung)
- FA-4: Feiertage BW in `config_feiertage` (2026 + 2027)
- FA-5: Workflow-Definitionen BW in `config_workflows` (je Verfahrensart)
- FA-6: Kenntnisgabeverfahren als BW-spezifischer Workflow (ohne Genehmigungsentscheidung, mit Baubeginn-Wartefrist)

## 4. User Stories & Akzeptanzkriterien

### US-1: Verfahrensarten BW anzeigen und auswaehlen

**Als** Sachbearbeiter in Freiburg **moechte ich** bei Bundesland "BW" die BW-spezifischen Verfahrensarten sehen, **damit** ich den korrekten Verfahrenstyp fuer einen Bauantrag waehlen kann.

- AC-1: GET `/api/verfahrensarten?bundesland=BW` liefert genau 4 Verfahrensarten: Kenntnisgabeverfahren, Vereinfachtes Baugenehmigungsverfahren, Baugenehmigung (regulaer), Bauvorbescheid
- AC-2: Jede Verfahrensart hat `rechtsgrundlage` mit korrektem §-Verweis auf LBO BW
- AC-3: Sortierung: Kenntnisgabe (1) < Vereinfacht (2) < Regulaer (3) < Vorbescheid (4)
- AC-4: Bei Bundesland "NW" werden weiterhin nur NRW-Verfahrensarten angezeigt (keine Regression)
- AC-5: Kategorie-Zuordnung: Kenntnisgabe = `kenntnisgabe`, Vereinfacht/Regulaer = `genehmigung`, Vorbescheid = `vorbescheid`

### US-2: Vorgang mit Kenntnisgabeverfahren anlegen

**Als** Sachbearbeiter in Freiburg **moechte ich** einen Vorgang mit Verfahrensart "Kenntnisgabeverfahren" anlegen, **damit** ich ein Bauvorhaben nach § 51 LBO BW bearbeiten kann.

- AC-1: POST `/api/vorgaenge` mit `verfahrensart_id` fuer Kenntnisgabe und `bundesland=BW` erstellt Vorgang erfolgreich
- AC-2: Workflow startet im Schritt "eingegangen" mit korrektem BW-Workflow
- AC-3: Aktenzeichen wird im Format `YYYY/KG-NNNN` generiert (Kuerzel "KG" fuer Kenntnisgabe)
- AC-4: Negativfall: Verfahrensart aus NRW mit bundesland=BW wird abgelehnt (400 Bad Request)

### US-3: Workflow Kenntnisgabeverfahren durchlaufen

**Als** Sachbearbeiter **moechte ich** den Kenntnisgabe-Workflow Schritt fuer Schritt durchlaufen, **damit** das Verfahren regelkonform nach LBO BW abgewickelt wird.

Workflow-Schritte Kenntnisgabe (§§ 51, 53, 59 LBO BW):
1. Eingegangen (automatisch)
2. Vollstaendigkeitspruefung (5 AT Eingangsbestaetigung, § 53 Abs. 5)
3. Nachforderung (optional, bei unvollstaendigen Unterlagen, § 53 Abs. 6)
4. Baubeginn-Wartefrist (2 Wochen ab Eingangsbestaetigung, § 59 Abs. 4)
5. Bauausfuehrung (Bau laeuft)
6. Abgeschlossen (Endstatus)

- AC-1: Workflow-Definition fuer Kenntnisgabe BW enthaelt alle 6 Schritte
- AC-2: Von "Vollstaendigkeitspruefung" sind Uebergaenge zu "Nachforderung" und "Baubeginn-Wartefrist" moeglich
- AC-3: Von "Nachforderung" ist Uebergang zu "Vollstaendigkeitspruefung" moeglich (Unterlagen nachgereicht)
- AC-4: Kein "Freizeichnung"-Schritt im Kenntnisgabe-Workflow (kein Genehmigungsbescheid)
- AC-5: Hinweistext bei "Baubeginn-Wartefrist": "Baubeginn fruehestens 2 Wochen nach Eingangsbestaetigung (§ 59 Abs. 4 LBO BW)"

### US-4: Workflow Baugenehmigung (vereinfacht) BW

**Als** Sachbearbeiter **moechte ich** den vereinfachten Genehmigungsworkflow nach § 52 LBO BW durchlaufen, **damit** Bauantraege im vereinfachten Verfahren korrekt bearbeitet werden.

Workflow-Schritte Vereinfacht (§§ 52, 54, 58 LBO BW):
1. Eingegangen (automatisch)
2. Vollstaendigkeitspruefung (10 AT, § 54 Abs. 1)
3. Nachforderung (optional)
4. Beteiligung (max. 1 Monat, § 54 Abs. 3)
5. Pruefung (1 Monat Entscheidungsfrist, § 54 Abs. 5)
6. Bescheid-Entwurf
7. Freizeichnung (Vier-Augen)
8. Zustellung
9. Abgeschlossen

- AC-1: Workflow-Definition enthaelt alle 9 Schritte analog NRW-BG-Workflow
- AC-2: Entscheidungsfrist betraegt 1 Monat (20 WT), nicht 2 Monate (§ 54 Abs. 5)
- AC-3: Genehmigungsfiktion greift bei Fristablauf (§ 58 Abs. 1a) — Hinweistext im Schritt "Pruefung"
- AC-4: Freizeichnung mit `minRolle: "referatsleiter"` (Vier-Augen analog NRW)

### US-5: Workflow Baugenehmigung (regulaer) BW

**Als** Sachbearbeiter **moechte ich** den regulaeren Genehmigungsworkflow nach §§ 49/58 LBO BW durchlaufen, **damit** Sonderbauten und komplexe Vorhaben korrekt bearbeitet werden.

- AC-1: Workflow-Schritte identisch mit vereinfachtem Verfahren (9 Schritte)
- AC-2: Entscheidungsfrist betraegt 2 Monate (40 WT, § 54 Abs. 5)
- AC-3: Beteiligungsfrist max. 1 Monat (20 WT, § 54 Abs. 3)
- AC-4: Vollstaendigkeitspruefung 10 AT (§ 54 Abs. 1)
- AC-5: Keine Genehmigungsfiktion im regulaeren Verfahren

### US-6: Fristen BW korrekt berechnen

**Als** Sachbearbeiter **moechte ich**, dass gesetzliche Fristen nach LBO BW automatisch berechnet werden, **damit** ich keine Fristen versaeume.

- AC-1: Bei Kenntnisgabe: Eingangsbestaetigung-Frist = 5 AT, Baubeginn-Wartefrist = 10 WT
- AC-2: Bei vereinfachtem Verfahren: Gesamtfrist = 20 WT, Beteiligungsfrist = 20 WT, Vollstaendigkeitspruefung = 10 AT
- AC-3: Bei regulaerem Verfahren: Gesamtfrist = 40 WT, Beteiligungsfrist = 20 WT, Vollstaendigkeitspruefung = 10 AT
- AC-4: Bei Bauvorbescheid: Entscheidungsfrist = 20 WT (§ 54 Abs. 5)
- AC-5: Feiertage BW werden korrekt beruecksichtigt (Heilige Drei Koenige, Fronleichnam, Allerheiligen)
- AC-6: Bundesweite Feiertage werden nicht doppelt gezaehlt (bereits in seed.sql als bundesland=NULL)
- AC-7: Ampel-Berechnung funktioniert identisch zu NRW (gruen/gelb/rot/dunkelrot)

### US-7: Feiertage BW 2026 und 2027

**Als** System **muss ich** die BW-spezifischen Feiertage fuer 2026 und 2027 kennen, **damit** Fristberechnungen korrekt sind.

BW-spezifische Feiertage (zusaetzlich zu bundesweiten):
- Heilige Drei Koenige (6. Januar)
- Fronleichnam (beweglich)
- Allerheiligen (1. November)

- AC-1: `config_feiertage` enthaelt fuer `bundesland='BW'`: Heilige Drei Koenige, Fronleichnam, Allerheiligen fuer 2026 und 2027
- AC-2: Fronleichnam 2026: 04.06.2026, Fronleichnam 2027: 27.05.2027
- AC-3: Heilige Drei Koenige 2026: 06.01.2026, 2027: 06.01.2027
- AC-4: Allerheiligen 2026: 01.11.2026, 2027: 01.11.2027
- AC-5: Keine Duplikate mit bundesweiten Feiertagen (Fronleichnam ist in BW UND NRW Feiertag — BW-Eintrag separat, da bundesland-spezifisch)

## 5. Nicht-funktionale Anforderungen

### Datenintegritaet

- **NFR-1 (Additivitaet):** Migration enthaelt ausschliesslich INSERT-Statements. Kein UPDATE, DELETE oder ALTER auf bestehende Zeilen. Rollback = `DELETE FROM config_* WHERE bundesland = 'BW'`.
- **NFR-2 (Fachliche Korrektheit):** Jede `rechtsgrundlage` in config_verfahrensarten und config_fristen muss exakt einem Paragraphen in `Input/Gesetzte/LBOs/Baden-Wuerttemberg.pdf` entsprechen. Verifikation durch QS Engineer vor Deployment.
- **NFR-3 (Schema-Konformitaet):** Jede Workflow-Definition (JSONB) muss gegen das bestehende WorkflowDefinition-TypeScript-Interface (`src/lib/services/workflow/types.ts`) validierbar sein. Kein neues Feld, kein fehlendes Pflichtfeld.
- **NFR-4 (Referenzielle Integritaet):** Jede `verfahrensart_id` in config_workflows und config_fristen referenziert eine existierende Zeile in config_verfahrensarten mit `bundesland='BW'`. FK-Constraint auf DB-Ebene sichert dies ab.

### Performance

- **NFR-5 (Query-Laufzeit):** `GET /api/verfahrensarten?bundesland=BW` antwortet in < 100ms (p95). Bestehender Index auf `config_verfahrensarten(bundesland)` genuegt — kein neuer Index erforderlich.
- **NFR-6 (Fristberechnung):** Fristberechnung fuer BW-Vorgaenge antwortet in < 200ms (p95). Bestehender Feiertags-Query mit `bundesland IN (NULL, 'BW')` wird durch vorhandenen Index auf `config_feiertage(bundesland, datum)` abgedeckt.
- **NFR-7 (Keine NRW-Regression):** Laufzeit der NRW-Queries darf sich durch BW-Daten nicht veraendern. Queries filtern immer auf `bundesland` — Tabellenwachstum durch BW-Zeilen hat keinen Einfluss auf NRW-Query-Plans.

### Sicherheit

- **NFR-8 (Service-Only-Zugriff):** Alle betroffenen Tabellen (config_verfahrensarten, config_workflows, config_fristen, config_feiertage) sind Service-Only mit deny-all RLS. Kein Client-seitiger Zugriff. Keine Aenderung an bestehenden RLS-Policies erforderlich.
- **NFR-9 (Keine neuen Umgebungsvariablen):** PROJ-44 fuehrt keine neuen Secrets oder Env-Variablen ein. Kein Eintrag in `.env.local.example` erforderlich.
- **NFR-10 (Tenant-Isolation):** Config-Daten sind bundeslandspezifisch, nicht tenantspezifisch. Kein Cross-Tenant-Risiko, da Config-Tabellen kein `tenant_id` haben (Service-Only per ADR-007).

### Rollback und Betrieb

- **NFR-11 (Rollback-Faehigkeit):** Rollback-Script enthaelt `DELETE FROM config_feiertage WHERE bundesland = 'BW'; DELETE FROM config_fristen WHERE bundesland = 'BW'; DELETE FROM config_workflows WHERE bundesland = 'BW'; DELETE FROM config_verfahrensarten WHERE bundesland = 'BW';` in dieser Reihenfolge (FK-Abhaengigkeiten). Keine vorgang_fristen oder vorgaenge betroffen, solange noch kein BW-Vorgang angelegt wurde.
- **NFR-12 (Zero-Downtime):** Migration ist rein additiv — kein Lock auf bestehende Tabellen, kein ALTER TABLE. Ausfuehrung waehrend laufendem Betrieb moeglich.

### Skalierbarkeit (Multi-BL-Pattern)

- **NFR-13 (Wiederholbarkeit):** Das Migrations-Pattern fuer BW dient als Template fuer weitere Bundeslaender. Struktur: 1 Migration pro BL mit Verfahrensarten → Workflows → Fristen → Feiertagen. Dokumentation des Patterns im Rollback-Script-Header.
- **NFR-14 (Datenmenge):** Pro Bundesland ca. 3-5 Verfahrensarten, 3-5 Workflows, 10-15 Fristen, 3-5 BL-spezifische Feiertage pro Jahr. Bei 16 BL und 5 Jahren: < 2.000 Zeilen gesamt in Config-Tabellen — kein Performance-Risiko.

## 6. Spezialisten-Trigger

- **Database Architect:** Migrations-SQL fuer Seed-Daten (config_verfahrensarten, config_workflows, config_fristen, config_feiertage)
- **Senior QS Engineer:** Verifikation aller §-Referenzen und Fristdauern gegen LBO-BW-PDF
- **Senior QS Engineer:** Regressionstest NRW-Workflows nach BW-Migration

## 7. Offene Fragen

- **OF-1:** Soll die Genehmigungsfiktion (§ 58 Abs. 1a LBO BW) als eigener Workflow-Schritt oder nur als Hinweistext modelliert werden? (Empfehlung: Hinweistext in Phase 1, eigener Schritt in Phase 2)
- **OF-2:** Braucht Freiburg fuer den Pilotstart auch den Bauvorbescheid-Workflow, oder genuegen Kenntnisgabe + Vereinfacht? (Klaerung mit Herrn Yilmaz)

## 8. Annahmen

- BW-Gebaeueklassen sind identisch mit MBO (keine BW-spezifischen Abweichungen)
- Bestehende Services (VerfahrenService, FristService, WorkflowService) unterstuetzen Multi-BL ueber den `bundesland`-Parameter ohne Code-Aenderungen
- Bundesweite Feiertage (bundesland=NULL) existieren bereits in der DB
- Die Fristdauern in Werktagen sind konservative Umrechnungen der Kalender-Angaben aus dem Gesetz

## 9. Abhaengigkeiten

- ADR-006 (Rechtskonfiguration als Daten) — Architekturentscheidung steht
- PROJ-3 (Vorgangsverwaltung): Verfahrensart-Auswahl, bundesland-Filter — Deployed
- PROJ-4 (Fristmanagement): Fristberechnung je BL, Ampel — Deployed
- PROJ-33 (Vier-Augen-Lite): Freizeichnung im BW-Genehmigungsworkflow — Deployed
- PROJ-35 (Vertretungsregelung): Stellvertreter-Freigabe — Deployed

## 10. Fachliche Risiken

| Risiko | Auswirkung | Gegenmassnahme |
|---|---|---|
| Falsche §-Referenzen in Fristen | Rechtlich problematisch fuer Freiburg | Jede §-Referenz gegen PDF verifizieren (QS-Pflicht) |
| Kenntnisgabe-Workflow passt nicht in bestehendes Schema | Umfangreichere Code-Aenderung noetig | Workflow-Schema vorab gegen JSON-Definition validieren |
| Fristumrechnung Kalendertage → Werktage ungenau | Falsche Fristberechnung | Konservative Umrechnung, Hinweis "gesetzlich: X Kalender-/Arbeitstage" |

## 11. Scope / Nicht-Scope

**Scope:**
- 4 Verfahrensarten BW (Kenntnisgabe, Vereinfacht, Regulaer, Vorbescheid)
- Workflow-Definitionen fuer alle 4 Verfahrensarten
- Gesetzliche Fristen je Verfahrensart
- Feiertage BW 2026 + 2027
- Migrations-SQL (rein additive INSERTs)

**Nicht-Scope:**
- service-bw-Schnittstelle (eigenes Item PROJ-45)
- Gebuehrenberechnung BW (Phase 3, PROJ-14)
- Genehmigungsfiktion als eigener Workflow-Schritt (Phase 2)
- BW-spezifische Bauvorlagen-Checklisten (spaeteres Item)
- Regelwerk-Dateien fuer Gebaeueklassen (identisch MBO, bereits vorhanden)
