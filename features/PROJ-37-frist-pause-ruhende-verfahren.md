# PROJ-37: Frist-Pause bei ruhenden Verfahren

**Status:** Deployed | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-27
**Herkunft:** Kunden-Session 27.03.2026, F-07 (Herr Brandt, Soest, P1)
**Prioritaet:** Pilotblocker
**Letzte Verfeinerung:** 2026-03-27 (req-stories: 4 User Stories, Abgrenzung Hemmung/Pause, Cross-Spec-Analyse, DB-Empfehlung)

---

## 1. Ziel / Problem

Wenn ein Bauverfahren ruht (z.B. Warten auf Stellungnahme eines Traegers oeffentlicher Belange), laufen die gesetzlichen Fristen im System weiter und die Ampel springt auf Rot. Das fuehrt zu falschen Eskalationen. Fachlich ruht die Frist bei ruhendem Verfahren -- das System muss das abbilden.

## 2. Fachlicher Kontext & Stakeholder

- **P1 (Erfahrener SB, Soest):** "Bei ruhenden Verfahren laeuft die Frist weiter, obwohl sie angehalten sein muesste"
- **Gesetzliche Grundlage:** Verfahrensruhe hemmt die Bearbeitungsfrist (analog Verjährungshemmung)
- **PROJ-4:** Fristmanagement -- Frist-Engine muss "Pause" unterstuetzen
- **PROJ-19:** Auto-Fristen -- pausierte Fristen duerfen nicht durch Workflow-Wechsel ueberschrieben werden

### Abgrenzung Hemmung (PROJ-4 US-5) vs. Pause (PROJ-37)

| Merkmal | Hemmung (PROJ-4 US-5) | Pause (PROJ-37) |
|---|---|---|
| Granularitaet | Einzelne Frist | Alle Fristen eines Vorgangs |
| Ausloeser | Fachlicher Grund auf Fristebene | Verfahrensruhe (gesamtes Verfahren) |
| Ampelstatus | `gehemmt` | `pausiert` (neu) |
| DB-Modell | Spalten auf `vorgang_fristen` | Separate `vorgang_pausen`-Tabelle |
| Mehrfach moeglich | Ja (kumulierte `hemmung_tage`) | Ja (kumulierte `pause_tage_gesamt`) |

## 3. Funktionale Anforderungen

- FA-1: Manueller Trigger "Verfahren ruht" pausiert alle aktiven, nicht gehemmten Fristen des Vorgangs
- FA-2: Bei Wiederaufnahme laufen Fristen mit verbleibender Restzeit weiter (Enddatum += Pause-Werktage)
- FA-3: Pausierte Fristen werden als eigener Ampelstatus dargestellt (`pausiert`, visuell grau)
- FA-4: Cron-Job (PROJ-22) ueberspringt pausierte Fristen bei der Ampel-Berechnung
- FA-5: Audit-Trail: Pause-Beginn und -Ende mit Begruendung protokollieren
- FA-6: PROJ-19 Auto-Fristen: Bei pausiertem Vorgang keine neuen Fristen automatisch erstellen (Warn-Log)
- FA-7: Bereits gehemmte Fristen werden durch Pause NICHT doppelt angehalten

## 4. User Stories & Akzeptanzkriterien

### US-1: Fristen pausieren bei Verfahrensruhe

Als Sachbearbeiter moechte ich die Fristen eines Vorgangs pausieren, wenn das Verfahren ruht, damit keine falschen Eskalationen entstehen.

**Akzeptanzkriterien:**
- AC-1.1: Aktion "Verfahren ruht" setzt alle aktiven, nicht gehemmten Fristen auf `status = 'pausiert'`
- AC-1.2: Begruendung ist Pflichtfeld (Freitext, min. 3 Zeichen)
- AC-1.3: Ein Datensatz in `vorgang_pausen` wird angelegt mit `vorgang_id`, `begruendung`, `pause_start = now()`
- AC-1.4: Pausierte Fristen werden in Vorgangsliste und Dashboard als grau mit "Pausiert" angezeigt
- AC-1.5: Cron-Job ueberspringt Fristen mit `status = 'pausiert'`
- AC-1.6: Vorgang-Header zeigt Hinweis "Verfahren ruht seit [Datum]"
- AC-1.7: Ein bereits pausierter Vorgang kann nicht erneut pausiert werden (API: 409)
- AC-1.8: Audit-Trail: `action: "verfahren.pausiert"`, Payload: `begruendung`, `anzahl_pausierter_fristen`

### US-2: Fristen wiederaufnehmen

Als Sachbearbeiter moechte ich pausierte Fristen wiederaufnehmen, damit die Restzeit weiterlaeuft.

**Akzeptanzkriterien:**
- AC-2.1: Aktion "Verfahren fortsetzen" setzt alle Fristen mit `status = 'pausiert'` auf korrekten Ampelstatus zurueck
- AC-2.2: Frist-Enddatum wird um Pause-Dauer (Werktage, exkl. Feiertage/Wochenenden) verlaengert
- AC-2.3: `vorgang_pausen`-Datensatz wird abgeschlossen: `pause_ende = now()`, `pause_werktage = berechneter Wert`
- AC-2.4: Kumuliertes Feld `pause_tage_gesamt` auf `vorgang_fristen` wird aktualisiert
- AC-2.5: Ampelstatus wird sofort neu berechnet (mit Schwellenwerten aus PROJ-34)
- AC-2.6: Fristen die waehrend der Pause gehemmt wurden bleiben gehemmt
- AC-2.7: Audit-Trail: `action: "verfahren.fortgesetzt"`, Payload: `pause_dauer_werktage`, `anzahl_fortgesetzter_fristen`

### US-3: Auto-Fristen-Schutz bei pausiertem Vorgang

Als System moechte ich verhindern, dass bei einem pausierten Vorgang automatische Fristen (PROJ-19) angelegt werden.

**Akzeptanzkriterien:**
- AC-3.1: `executeWorkflowAktion` prueft vor Fristanlage ob Vorgang pausiert ist
- AC-3.2: Bei pausiertem Vorgang: keine Frist angelegt, Warn-Log `[PROJ-37] Vorgang {id} ist pausiert`
- AC-3.3: Workflow-Aktion selbst wird NICHT blockiert — nur Auto-Fristanlage wird unterdrueckt
- AC-3.4: Nach Wiederaufnahme greift Auto-Frist-Logik wieder normal

### US-4: Dashboard-Hinweis fuer lang ruhende Verfahren

Als Referatsleiter moechte ich sehen, welche Verfahren ungewoehnlich lange ruhen, damit vergessene Wiederaufnahmen erkannt werden.

**Akzeptanzkriterien:**
- AC-4.1: Im Frist-Dashboard (PROJ-21) wird "X Verfahren ruhen seit > 30 Tagen" angezeigt
- AC-4.2: Klick zeigt Liste der betroffenen Vorgaenge
- AC-4.3: Schwellenwert (30 Tage) ist konfigurierbare Konstante
- AC-4.4: Vorgaenge ohne offene Pause werden nicht gelistet

**Hinweis PO:** US-4 kann als separates Item ausgelagert werden, falls Scope zu gross.

## 5. Nicht-funktionale Anforderungen

- NFR-1: Cron-Job-Performance: Pause-Pruefung darf keine zusaetzliche DB-Abfrage pro Frist erfordern
- NFR-2: Frist-Berechnung bei mehrfachem Pause/Resume korrekt (Testfall: 3x Pause/Resume mit je 5 WT = 15 Tage)
- NFR-3: Pause-API-Response < 500ms (inkl. Aktualisierung aller Fristen, max. 10 pro Vorgang)
- NFR-4: WCAG 2.2 AA fuer Pausiert-Badge (Farbe + Icon + Text)
- NFR-5: Audit-Trail fuer Pause/Resume ist Pflicht

## 6. Spezialisten-Trigger

- **Database Architect:** Separate `vorgang_pausen`-Tabelle (id, tenant_id, vorgang_id, begruendung, pause_start, pause_ende, pause_werktage). `vorgang_fristen` erhaelt `pausiert boolean DEFAULT false` und `pause_tage_gesamt int DEFAULT 0`. CHECK-Constraint und Index anpassen.
- **Senior Backend Developer:** FristService erweitern (`pausiereVorgang()`, `setzeVorgangFort()`). Cron-Job Pause-Filter. PROJ-19 WorkflowService Pause-Check. Neue API: `POST /api/vorgaenge/[id]/pause`, `POST /api/vorgaenge/[id]/fortsetzen`.
- **Senior Frontend Developer:** AmpelStatus um "pausiert" erweitern. AmpelBadge grau. Vorgang-Detail Buttons. Header-Banner.
- **Senior QS Engineer:** Zeittests (Pause+Feiertage, Mehrfach-Pause, Hemmung+Pause, Race Conditions).

## 7. Offene Fragen

- ~~Q-1: Mehrfach ruhen?~~ Ja, `vorgang_pausen`-Tabelle speichert jede Pause.
- ~~Q-2: Interne Fristen (PROJ-28) pausierbar?~~ Ja, alle Fristen des Vorgangs.
- ~~Q-3: Genehmigungspflicht Referatsleiter?~~ Nein im MVP, SB-Berechtigung reicht.
- Q-4 (fuer Architekt): `vorgang_fristen.status` um `'pausiert'` erweitern oder separates Boolean `pausiert`?

## 8. Annahmen

- A-1: PROJ-4 und PROJ-22 sind deployed
- A-2: Verfahrensruhe wird manuell ausgeloest
- A-3: Alle Fristen eines Vorgangs werden gemeinsam pausiert
- A-4: Gehemmte Fristen bleiben gehemmt waehrend Pause
- A-5: Keine Vier-Augen-Freigabe fuer Pause noetig

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ | Status |
|---|---|---|
| PROJ-4 (Fristmanagement) | Voraussetzung | Deployed |
| PROJ-19 (Auto-Fristen) | Anpassung noetig (US-3) | Deployed |
| PROJ-22 (Cron-Job) | Anpassung noetig | Deployed |
| PROJ-20 (Frist-Ampel) | Anpassung noetig (neuer Status) | Deployed |
| PROJ-21 (Frist-Dashboard) | Anpassung noetig (US-4) | Deployed |
| PROJ-28 (Nicht-gesetzliche Fristen) | Kompatibel | Planned |
| PROJ-34 (Schwellenwerte) | Kompatibel | Deployed |

## 10. Fachliche Risiken

| Risiko | Auswirkung | Gegenmassnahme |
|---|---|---|
| SB vergisst Wiederaufnahme | Verfahren ruht ewig | US-4: Dashboard-Hinweis > 30 Tage |
| Pause-Berechnung ueber Feiertage fehlerhaft | Falsche Restlaufzeit | Umfangreiche Zeittests (QS) |
| Race Condition Pause waehrend Cron | Cron aktualisiert pausierte Frist | Cron filtert auf status != 'pausiert' |
| Zustandskollision Hemmung + Pause | Doppelte Fristverlaengerung | Gehemmte Fristen bei Pause nicht erneut anhalten (FA-7) |

## 11. Scope / Nicht-Scope

**Scope:**
- Manuelles Pausieren/Wiederaufnehmen aller Fristen eines Vorgangs (US-1, US-2)
- Neuer Ampelstatus "pausiert" (grau, WCAG 2.2 AA)
- Audit-Trail fuer Pause/Resume
- Korrekte Restzeit-Berechnung (kumulierte Pause-Werktage)
- Auto-Fristen-Schutz bei pausiertem Vorgang (US-3)
- Dashboard-Hinweis > 30 Tage (US-4, optional)
- DB-Migration: `vorgang_pausen`-Tabelle, Status-Erweiterung

**Nicht-Scope:**
- Automatisches Pausieren bei bestimmten Workflow-Schritten
- Einzelne Fristen pausieren (immer alle pro Vorgang)
- Genehmigungspflicht durch Referatsleiter
- Admin-UI fuer 30-Tage-Schwellenwert (Konstante reicht)
