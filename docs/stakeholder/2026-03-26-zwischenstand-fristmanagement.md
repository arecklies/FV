# Protokoll: Online-Zwischenstandstermin Bestandskunden

**Datum:** 26. Maerz 2026, 14:00 - 16:00 Uhr (Online, MS Teams)
**Moderation:** Senior Produktmanager
**Teilnehmer:** 18 Vertreter aus 12 Bestandskunden-Behoerden
**Protokollant:** Produktmanagement
**Vertraulichkeit:** Intern / Bestandskunden

---

## 1. Praesentation: Statusupdate und Live-Demo

### 1.1 Rueckblick seit letztem Termin

| Bereich | Fortschritt | Status |
|---|---|---|
| Auth und Login (PROJ-1) | Login-UI, Admin-Panel, Auth-Provider | Deployed |
| Mandantentrennung (PROJ-2) | Datenbankschema und RLS-Architektur | Planned |
| Vorgangsverwaltung (PROJ-3) | CRUD, Workflow-Engine, Statusverwaltung | Deployed |
| Fristmanagement (PROJ-4) | Frist-Engine, Ampellogik, Verlaengerung, Hemmung | Deployed (Conditional) |
| Architekturentscheidungen | 12 ADRs dokumentiert | Abgeschlossen |

### 1.2 Live-Demo PROJ-4 Fristmanagement

Gezeigt wurde:
1. Automatische Fristberechnung bei Vorgangsanlage (Werktage + Feiertage NRW)
2. Ampellogik: Gruen > 50%, Gelb 25-50%, Rot < 25%, Dunkelrot ueberschritten
3. Fristverlaengerung mit Begruendungspflicht + Audit-Trail
4. Fristhemmung bei Unvollstaendigkeit + automatische Verlaengerung bei Aufhebung

### 1.3 Roadmap-Update

**Kurzfristig (4-6 Wochen):** PROJ-19 (Auto-Fristen), PROJ-20 (Ampel in Liste), PROJ-21 (Dashboard-Gruppierung)
**Mittelfristig (Phase 1):** PROJ-5 (Dokumente), PROJ-6 (Bescheide), PROJ-7 (XBau), PROJ-12 (ToEB-Beteiligung)
**Pilotbetrieb:** Q1 2027

---

## 2. Kundenfeedback nach Behoerdengroesse

### 2.1 Grosse Bauaufsicht (55 SB, 1.200 Vorgaenge/Jahr)

**Positiv:** Ampellogik lange gefordert, Hemmung mit Begruendungspflicht gibt Rechtssicherheit, Barrierefreiheit wird vom Personalrat begruesst.

**Fehlt:** Ampel in Vorgangsliste (PROJ-20) dringend noetig bei Volumen, Filter nach Ampelstatus, Frist-Export als PDF/Excel fuer Dezernatsleitung.

**Neue Ideen:** Vertretungslogik bei Frist-Eskalation, konfigurierbare Ampel-Schwellenwerte, Musterdienstvereinbarung fuer Personalrat.

**Bedenken:** Personalrat-Blockade bei Dashboard, SSO-Freigabe durch zentrale IT (3-6 Monate Vorlauf), Performance bei 30+ gleichzeitigen Nutzern.

### 2.2 Mittlere Kreisbaubehoerde (16 SB, 350 Vorgaenge/Jahr)

**Positiv:** Automatische Werktage-Berechnung verhindert Fehler, Audit-Trail schuetzt bei Kommunalaufsicht, moderne UI motiviert junge Kolleginnen.

**Fehlt:** Sicherstellung dass alle 16 BL korrekt konfiguriert sind (nicht nur NRW-Demo), nicht-gesetzliche interne Fristen, E-Mail-Erinnerungen vor Fristablauf.

**Neue Ideen:** Fristen-Kalenderansicht (FA-6, bereits spezifiziert), Friststatistik fuer Jahresbericht.

**Bedenken:** Datenmigration aus 12 Jahren ProBauG, kein eigenes IT-Personal (Support-Frage), Budget ca. 15-20 TEUR/Jahr.

### 2.3 Kleine Bauaufsicht (4 SB, 80 Vorgaenge/Jahr)

**Positiv:** Ampel hilft beim Ueberblick ohne Listen, Web-Anwendung im Browser statt langsame .NET-App, faire Fristberechnung bei Hemmung.

**Fehlt:** Einfache persoenliche Tagesansicht statt komplexem Dashboard, Fristen fuer Ordnungsverfuegungen (nicht nur Baugenehmigungen).

**Neue Ideen:** Persoenliche To-Do-Ansicht ("Mein Tag"), E-Mail-Erinnerung an Antragsteller bei fehlenden Unterlagen.

**Bedenken:** Budget unter 5.000 EUR/Jahr, Einarbeitung fuer Nachfolger, Internetgeschwindigkeit im Rathaus.

---

## 3. Konsolidierte Feature-Ideen

| # | Idee | Prioritaet | Im Backlog? | Empfehlung |
|---|---|---|---|---|
| F-01 | Frist-Filter in Vorgangsliste | SHOULD | Nicht-Scope PROJ-20 | In PROJ-20 Scope aufnehmen |
| F-02 | Frist-Export PDF/Excel | SHOULD | Teilw. PROJ-13 | Quick-Win in Phase 1 |
| F-03 | Vertretungslogik Eskalation | SHOULD | Phase 2 (PROJ-9) | In PROJ-9 Spec aufnehmen |
| F-04 | Konfigurierbare Ampel-Schwellen | COULD | Nein | Spaeter, NFR-Erweiterung |
| F-05 | Nicht-gesetzliche Fristen | SHOULD | Nein | **Neues Item PROJ-28** |
| F-06 | Fristen-Kalenderansicht | MUST | FA-6 in PROJ-4 | **Priorisieren** |
| F-07 | Friststatistik Jahresbericht | COULD | Teil PROJ-13 | Phase 3 |
| F-08 | Persoenliche To-Do/Tagesansicht | SHOULD | Nein | **Neues Item PROJ-29** |
| F-09 | E-Mail an Antragsteller | COULD | Nein | Spaeter (DSGVO-Pruefung) |
| F-10 | Musterdienstvereinbarung | MUST | Nein (Dokument) | **Sofort erstellen** |

---

## 4. Stimmungsbild

| Dimension | Einschaetzung |
|---|---|
| Interesse | Hoch -- alle Teilnehmer mit intensiven Rueckfragen |
| Kaufbereitschaft | Verhalten-positiv, grosse/mittlere signalisieren Pilotbereitschaft |
| Vertrauen | Wachsend, Demo hat ueberzeugt, gesunde Skepsis bleibt |
| Hauptbedenken | 1. Datenmigration, 2. Kosten, 3. Support, 4. Personalrat |
| Naechste Huerde | Preiskommunikation (ohne Angebot keine interne Freigabe) |

---

## 5. Empfohlene Massnahmen

| # | Massnahme | Prioritaet | Zeitrahmen |
|---|---|---|---|
| 1 | PROJ-19/20/21 priorisieren (Ampel in Liste ist dringendstes Feature) | MUST | Naechster Sprint |
| 2 | FA-6 Kalenderansicht als eigenes PROJ-Item separieren | SHOULD | 2 Wochen |
| 3 | PROJ-28 anlegen: Nicht-gesetzliche Fristen | SHOULD | Backlog |
| 4 | PROJ-29 anlegen: Persoenliche Tagesansicht | SHOULD | Backlog |
| 5 | Musterdienstvereinbarung erstellen | MUST | Vor naechstem Termin |
| 6 | Preismodell-Entwurf (3 Tiers nach Behoerdengroesse) | MUST | Vor naechstem Termin |
| 7 | SSO-Vorlauf-Checkliste fuer IT-Abteilungen | SHOULD | 4 Wochen |
| 8 | Naechster Kundentermin: KW 18/19, Demo PROJ-20 + Preis | MUST | Terminierung diese Woche |

---

## 6. Offene Entscheidungen (PO)

1. Preismodell: Gestaffelt (3 Tiers) oder pauschal?
2. FA-6 Kalenderansicht: Phase 1 vorziehen oder nach Phase 1?
3. Frist-Filter in PROJ-20 Scope aufnehmen oder separates Item?
