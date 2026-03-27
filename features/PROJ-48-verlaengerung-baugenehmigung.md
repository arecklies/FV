# PROJ-48: Verlängerung der Baugenehmigung

**Status:** Deployed (Conditional: B-48-01 Bestandsdaten-Nachpflege) | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-27
**Herkunft:** Kunden-Demo-Validierung 27.03.2026 (Antragsarten-Review)
**Priorität:** P2

---

## 1. Ziel / Problem

Eine erteilte Baugenehmigung erlischt nach 3 Jahren, wenn mit dem Bau nicht begonnen wurde (NRW: § 75 Abs. 1 BauO NRW, BW: § 62 LBO BW). Der Bauherr kann vor Ablauf eine Verlängerung beantragen. Aktuell gibt es im System keine Möglichkeit, die Geltungsdauer einer Genehmigung zu erfassen oder eine Verlängerung zu bearbeiten. Ohne dieses Feature müsste ein komplett neuer Bauantrag gestellt werden.

## 2. Fachlicher Kontext & Stakeholder

- **P1 (Sachbearbeiter):** Muss Verlängerungsanträge bearbeiten und die Geltungsdauer im Blick behalten
- **Bauherren (indirekt):** Stellen Verlängerungsanträge, wenn Bauvorhaben sich verzögern
- **Rechtsgrundlage NRW:** § 75 Abs. 1 BauO NRW — Baugenehmigung erlischt, wenn nicht innerhalb von 3 Jahren nach Erteilung begonnen wird. Verlängerung auf schriftlichen Antrag vor Ablauf möglich.
- **Rechtsgrundlage BW:** § 62 LBO BW — Analog zu NRW

### Bestehende Implementierung (Schnittstellen)

- **Vorgänge-Tabelle:** `vorgaenge` hat kein Feld `geltungsdauer_bis` — muss ergänzt werden (ADD COLUMN)
- **Workflow:** Endstatus `abgeschlossen` erlaubt aktuell keine weiteren Aktionen. Verlängerung ist kein Workflow-Schritt, sondern ein Verwaltungsakt AUF einem abgeschlossenen Vorgang.
- **Bestehende Frist-Verlängerung:** `POST /api/vorgaenge/[id]/fristen/[fristId]/verlaengerung` — betrifft Bearbeitungsfristen innerhalb laufender Vorgänge, NICHT die Geltungsdauer der Genehmigung. Kein Namenskonflikt, da andere Route und anderes Datenmodell.

## 3. Funktionale Anforderungen

- FA-1: Neues Feld `geltungsdauer_bis` (timestamptz, nullable) auf `vorgaenge`
- FA-2: Automatische Berechnung von `geltungsdauer_bis` beim Erreichen des Schritts "zustellung" (Bescheid zugestellt = Genehmigung erteilt). Dauer aus `config_fristen` je BL/Verfahrensart (Typ `geltungsdauer`, Standard: 3 Jahre = 1095 Kalendertage).
- FA-3: Neue Tabelle `vorgang_verlaengerungen` für Verlängerungshistorie
- FA-4: Aktion "Verlängerung beantragen" auf Vorgängen mit `workflow_schritt_id = 'abgeschlossen'` und Verfahrensart-Kategorie `genehmigung` oder `vorbescheid`
- FA-5: Bei Verlängerung: neues `geltungsdauer_bis` setzen (Standard: +1 Jahr ab bisherigem Ablaufdatum)
- FA-6: Verlängerungshistorie am Vorgang sichtbar (Datum, Sachbearbeiter, altes/neues Ablaufdatum, Begründung)
- FA-7: Verlängerung nur möglich solange `geltungsdauer_bis` in der Zukunft liegt (vor Ablauf)

## 4. User Stories & Akzeptanzkriterien

### US-1: Geltungsdauer bei Bescheidzustellung setzen

**Als** System **muss ich** beim Workflow-Übergang zum Schritt "zustellung" automatisch das Feld `geltungsdauer_bis` berechnen, **damit** die Geltungsdauer der Genehmigung nachvollziehbar erfasst ist.

- AC-1: Beim Workflow-Übergang zu "zustellung" wird `geltungsdauer_bis` auf `now() + config_fristen.geltungsdauer` gesetzt
- AC-2: Die Geltungsdauer ist je Bundesland und Verfahrensart konfigurierbar in `config_fristen` (Typ: `geltungsdauer`)
- AC-3: Standard-Geltungsdauer NRW (§ 75 Abs. 1 BauO NRW): 3 Jahre (1095 Kalendertage)
- AC-4: Standard-Geltungsdauer BW (§ 62 LBO BW): 3 Jahre (1095 Kalendertage)
- AC-5: Für Kenntnisgabeverfahren (Kategorie `kenntnisgabe`) wird keine Geltungsdauer gesetzt (NULL bleibt)
- AC-6: Freistellungsverfahren (Kategorie `freistellung`): Geltungsdauer wird gesetzt (auch Freistellungen erlöschen nach § 63 Abs. 4 BauO NRW)
- AC-7: Bereits abgeschlossene Vorgänge (Bestandsdaten) können `geltungsdauer_bis` manuell nachpflegen

### US-2: Geltungsdauer auf Vorgangsdetail anzeigen

**Als** Sachbearbeiter **möchte ich** auf der Vorgangsdetailseite das Ablaufdatum der Genehmigung sehen, **damit** ich den Bauherrn rechtzeitig informieren kann.

- AC-1: Im Bereich "Vorgangsinformationen" wird das Feld "Geltungsdauer bis" angezeigt (nur bei abgeschlossenen Vorgängen mit gesetztem Wert)
- AC-2: Farbliche Kennzeichnung: Grün (> 6 Monate), Gelb (< 6 Monate), Rot (< 3 Monate), Dunkelrot (abgelaufen)
- AC-3: Bei abgelaufener Geltungsdauer: Hinweistext "Genehmigung erloschen — keine Verlängerung mehr möglich"
- AC-4: Bei Vorgängen ohne Geltungsdauer (Kenntnisgabe, noch nicht zugestellt): Feld wird nicht angezeigt

### US-3: Verlängerung beantragen und gewähren

**Als** Sachbearbeiter **möchte ich** für einen abgeschlossenen Vorgang eine Verlängerung der Genehmigung erfassen, **damit** der Bauherr nicht erneut einen vollständigen Bauantrag stellen muss.

- AC-1: Button "Verlängerung erfassen" ist sichtbar auf abgeschlossenen Vorgängen mit Kategorie `genehmigung`, `vorbescheid` oder `freistellung`, wenn `geltungsdauer_bis` in der Zukunft liegt
- AC-2: Dialog enthält: Antragsdatum (Pflicht), Begründung (Pflicht, min. 10 Zeichen), Verlängerungsdauer (Vorauswahl: 1 Jahr, editierbar)
- AC-3: `POST /api/vorgaenge/[id]/verlaengerung` validiert mit Zod: `antragsdatum` (ISO-Datum), `begruendung` (min 10 Zeichen), `verlaengerung_tage` (positiv, max. 1095)
- AC-4: Neues `geltungsdauer_bis` = bisheriges `geltungsdauer_bis` + `verlaengerung_tage`
- AC-5: Eintrag in `vorgang_verlaengerungen` wird erstellt (vorgang_id, altes Datum, neues Datum, antragsdatum, begründung, sachbearbeiter_id)
- AC-6: Feld `geltungsdauer_bis` auf `vorgaenge` wird aktualisiert
- AC-7: Negativfall: Wenn `geltungsdauer_bis` bereits abgelaufen → HTTP 400 "Genehmigung ist bereits erloschen — Verlängerung nicht mehr möglich"
- AC-8: Negativfall: Wenn Verfahrensart-Kategorie `kenntnisgabe` → HTTP 400 "Kenntnisgabeverfahren haben keine verlängerbare Geltungsdauer"
- AC-9: Negativfall: Wenn Vorgang nicht im Status `abgeschlossen` → HTTP 400 "Verlängerung nur für abgeschlossene Vorgänge möglich"
- AC-10: Verlängerung wird im Audit-Trail protokolliert (`writeAuditLog`)

### US-4: Verlängerungshistorie einsehen

**Als** Sachbearbeiter **möchte ich** sehen, ob und wann eine Genehmigung verlängert wurde, **damit** ich den Verlauf nachvollziehen kann.

- AC-1: Auf der Vorgangsdetailseite wird ein Abschnitt "Verlängerungshistorie" angezeigt (nur wenn mindestens 1 Verlängerung existiert)
- AC-2: Jeder Eintrag zeigt: Antragsdatum, Sachbearbeiter (E-Mail), bisheriges Ablaufdatum, neues Ablaufdatum, Begründung
- AC-3: Sortierung: neueste Verlängerung zuerst
- AC-4: `GET /api/vorgaenge/[id]/verlaengerungen` liefert die Liste (mit Auth-Check und Tenant-Filterung)

### US-5: Mehrfache Verlängerung

**Als** Sachbearbeiter **möchte ich** eine Genehmigung auch mehrfach verlängern können, **damit** Bauvorhaben mit langer Planungsphase nicht verfallen.

- AC-1: Eine erneute Verlängerung ist möglich, solange `geltungsdauer_bis` (nach letzter Verlängerung) noch in der Zukunft liegt
- AC-2: Die Verlängerungshistorie zeigt alle bisherigen Verlängerungen chronologisch
- AC-3: Es gibt kein systemseitiges Maximum für die Anzahl der Verlängerungen (fachliche Entscheidung liegt beim Sachbearbeiter)

## 5. Nicht-funktionale Anforderungen

(Werden durch `/req-nfr` ergänzt)

## 6. Spezialisten-Trigger

- **Database Architect:** ADD COLUMN `geltungsdauer_bis` auf `vorgaenge`, neue Tabelle `vorgang_verlaengerungen` mit RLS (Service-Only), neuer Eintrag in `config_fristen` (Typ `geltungsdauer`)
- **Senior Backend Developer:** API-Route `POST /api/vorgaenge/[id]/verlaengerung`, `GET /api/vorgaenge/[id]/verlaengerungen`, Auto-Berechnung `geltungsdauer_bis` bei Workflow-Übergang "zustellung"
- **Senior Frontend Developer:** Geltungsdauer-Anzeige auf Vorgangsdetail, Verlängerungsdialog, Verlängerungshistorie-Abschnitt

## 7. Offene Fragen

- ~~OF-1: Soll das Ablaufdatum automatisch bei Bescheidzustellung gesetzt werden oder manuell?~~ → Automatisch (US-1), manuell nachpflegbar für Bestandsdaten (US-1 AC-7)
- ~~OF-2: Ist die Verlängerungsdauer bundeslandspezifisch konfigurierbar oder einheitlich 1 Jahr?~~ → Konfigurierbar in config_fristen, Standard 1 Jahr
- ~~OF-3: Kann ein Vorgang mehrfach verlängert werden?~~ → Ja (US-5)
- OF-4: Soll die Geltungsdauer auch in der Vorgangsliste als Spalte/Filter verfügbar sein? (Empfehlung: Phase 2, separates Item)
- OF-5: Sollen Vorgänge mit ablaufender Geltungsdauer (<3 Monate) in der Tagesansicht (PROJ-29) erscheinen?

## 8. Annahmen

- Verlängerung ist möglich bei Vorgängen mit Kategorie `genehmigung`, `vorbescheid` oder `freistellung`
- Kenntnisgabeverfahren (BW) haben keine Geltungsdauer im gleichen Sinne (Baubeginn nach 2-Wochen-Frist)
- Verlängerung erfordert keine erneute ToEB-Beteiligung (vereinfachte Prüfung)
- Geltungsdauer wird in Kalendertagen gerechnet (nicht Werktagen — § 75 BauO NRW spricht von "Jahren")
- Die `vorgang_verlaengerungen`-Tabelle ist Service-Only (kein direkter Client-Zugriff)

## 9. Abhängigkeiten

- PROJ-3 Vorgangsverwaltung (Deployed) — Vorgang-Datenmodell, `vorgaenge`-Tabelle
- PROJ-4 Fristmanagement (Deployed) — `config_fristen`-Tabelle, Frist-Infrastruktur
- PROJ-19 Auto-Fristen bei Workflow-Schritt-Wechsel (Deployed) — Pattern für automatische Aktionen bei Schritt-Übergang
- PROJ-30 Workflow-Aktionen mit Kontextinformation (Planned) — UX-Pattern für Aktionen auf Vorgängen

## 10. Fachliche Risiken

| Risiko | Auswirkung | Gegenmassnahme |
|---|---|---|
| Verlängerungsfrist bundeslandspezifisch unterschiedlich | Falsche Ablaufdaten | Konfigurierbar in config_fristen (Typ `geltungsdauer`) |
| Verlängerung nach Ablauf beantragt | Rechtlich unzulässig | Validierung: Antrag nur vor Ablaufdatum möglich (US-3 AC-7) |
| Geltungsdauer für Bestandsdaten nicht gesetzt | Fehlende Anzeige für migrierte Vorgänge | Manuelle Nachpflege möglich (US-1 AC-7) |

## 11. Scope / Nicht-Scope

**Scope:**
- Geltungsdauer-Feld auf Vorgang (automatisch + manuell)
- Verlängerungsaktion als Dialog auf abgeschlossenen Vorgängen
- Verlängerungshistorie-Tabelle und Anzeige
- Farbliche Kennzeichnung der verbleibenden Geltungsdauer
- Konfigurierbare Geltungsdauer je BL/Verfahrensart

**Nicht-Scope:**
- Automatische Erinnerung vor Ablauf (separates Item)
- Gebührenberechnung für Verlängerung (PROJ-14, Phase 3)
- Geltungsdauer als Filter/Spalte in Vorgangsliste (separates Item)
- Integration in Tagesansicht PROJ-29 (separates Item)
