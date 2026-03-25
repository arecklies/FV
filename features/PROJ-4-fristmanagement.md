# PROJ-4: Fristmanagement mit Eskalation und Ampellogik

**Status:** Planned | **Phase:** 1 (Kern-MVP) | **Erstellt:** 2026-03-25

---

## 1. Ziel / Problem

Fristmanagement ist die hoechstpriorisierte Anforderung aller 4 Stakeholder (Research-Synthese: Kaufrelevanz 5/5, Nutzungsfrequenz 5/5). Gesetzliche Fristen (z.B. 3-Monats-Frist BauO NRW) duerfen nicht unbemerkt verstreichen. Fristversaeumnisse haben rechtliche und politische Konsequenzen.

## 2. Fachlicher Kontext & Stakeholder

- **P1:** Gesetzliche Fristen nach LBO automatisch berechnet, konfigurierbare Erinnerungen
- **P2:** Farbliche Ampel (gruen/gelb/rot), To-Do-Ansicht nach Dringlichkeit
- **P3:** Fristgefaehrdete Vorgaenge im Dashboard, Eskalation bei Ueberschreitung
- **P4:** Keine kritischen Fristversaeumnisse (politische Haftung)
- **ADR-003:** FristService unter `src/lib/services/fristen/`
- **ADR-006:** Fristen als konfigurierbare Datensaetze je Bundesland

## 3. Funktionale Anforderungen

- FA-1: Frist-Engine: Automatische Berechnung gesetzlicher Fristen ab Verfahrensart und Ereignis
- FA-2: Konfigurierbare Fristen pro Bundesland (aus `config_fristen`)
- FA-3: Werktage-Berechnung (Feiertage je Bundesland, kein Wochenende)
- FA-4: Ampellogik: Gruen (> 50% Frist), Gelb (25-50%), Rot (< 25% oder < 5 Werktage), Dunkelrot (ueberschritten)
- FA-5: Eskalationsstufen: In-App-Notification -> E-Mail -> Referatsleiter-Dashboard
- FA-6: Fristkalender-Ansicht (Wochen-/Monatsansicht)
- FA-7: Manuelle Fristverlaengerung (mit Begruendungspflicht, im Audit-Trail)
- FA-8: Fristhemmung (z.B. bei Unvollstaendigkeit, mit dokumentiertem Grund)

## 4. User Stories & Akzeptanzkriterien

### US-1: Automatische Fristberechnung
Als Sachbearbeiter moechte ich bei Vorgangsanlage die gesetzlichen Fristen automatisch berechnet sehen.
- AC-1: Frist wird aus Verfahrensart + Bundesland + Eingangsdatum berechnet
- AC-2: Werktage-Berechnung beruecksichtigt Feiertage des Bundeslandes
- AC-3: Frist wird im Vorgang angezeigt mit Ampelfarbe + Icon + Text (BITV-konform)

### US-2: Frist-Ampel in Vorgangsliste
Als Sachbearbeiter moechte ich auf einen Blick sehen, welche Vorgaenge fristgefaehrdet sind.
- AC-1: Ampel-Badge in Vorgangsliste (relativ: % der Frist, nicht absolut)
- AC-2: Farbe + Icon + Text (nie nur Farbe - Barrierefreiheit)
- AC-3: Sortierung nach Fristdringlichkeit moeglich

### US-3: Eskalation an Referatsleiter
Als Referatsleiter moechte ich fristgefaehrdete Vorgaenge meines Referats sehen.
- AC-1: Dashboard-Widget: Fristgefaehrdete Vorgaenge (< 25% Frist oder ueberschritten)
- AC-2: Gruppiert nach Sachbearbeiter
- AC-3: Erst bei Ueberschreitung im Referatsleiter-Dashboard (keine Alarm-Muedigkeit)

### US-4: Fristverlaengerung
Als Sachbearbeiter moechte ich eine Frist verlaengern koennen (z.B. bei Nachforderung).
- AC-1: Verlaengerung mit Begruendung (Pflichtfeld)
- AC-2: Neue Frist wird berechnet
- AC-3: Verlaengerung im Audit-Trail protokolliert

## 5. Nicht-funktionale Anforderungen

- NFR-1: Fristberechnung < 100ms (reine Logik, keine DB-Abfrage)
- NFR-2: Feiertage je Bundesland als Konfiguration (nicht hardcoded)
- NFR-3: Jedes Fristereignis im Audit-Trail (Setzung, Verlaengerung, Hemmung, Ablauf)
- NFR-4: Ampeldarstellung WCAG 2.2 AA (Farbe + Icon + Text)

## 6. Spezialisten-Trigger

- **UI/UX Designer:** Frist-Ampel-Design, Alarm-Muedigkeit vermeiden, Dashboard-Widget
- **Backend Developer:** FristService, Werktage-Berechnung, Erinnerungs-Cron
- **Database Architect:** Frist-Tabelle, Indizes fuer fristgefaehrdete Abfragen

## 7. Offene Fragen

1. Welche gesetzlichen Fristen gelten je Verfahrensart in NRW? (Quelldokument: Input/Gesetzte/LBOs/)
2. Wie werden E-Mail-Erinnerungen technisch ausgeloest (Cron-Job, Supabase pg_cron)?
3. Soll die Fristberechnung auch Halbfristen (50%) als Warnung ausgeben?

## 8. Annahmen

- MVP mit BauO NRW Fristen (3-Monats-Frist, 10-Tages-Frist Unvollstaendigkeit)
- Feiertage NRW als erster Datensatz, weitere BL spaeter
- E-Mail-Versand ueber bestehenden SMTP-Dienst

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-3 (Vorgangsverwaltung) | Voraussetzung (Vorgaenge muessen existieren) |
| ADR-006 (Rechtskonfiguration) | config_fristen je BL |
| PROJ-10 (Audit-Trail) | Fristereignisse protokollieren |

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Fristberechnung fehlerhaft | Mittel | Rechtliche Konsequenzen | Tests gegen Quelldokumente, Vier-Augen bei Konfiguration |
| Alarm-Muedigkeit bei vielen gelben/roten Ampeln | Hoch | Ampel wird ignoriert | Relative statt absolute Darstellung, Eskalation nur bei Ueberschreitung |
| Feiertage falsch konfiguriert | Niedrig | Falsche Fristberechnung | Offizielle Feiertagsliste als Quelle, jaehrliche Aktualisierung |
