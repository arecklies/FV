# ADR-014: Frist-Pause bei Verfahrensruhe

**Status:** Accepted
**Datum:** 2026-03-27
**Autor:** Senior Software Architect
**Feature:** PROJ-37 (Frist-Pause bei ruhenden Verfahren)

## Kontext

Wenn ein Bauverfahren ruht (z.B. Warten auf ToeB-Stellungnahme), laufen gesetzliche Fristen im System weiter und die Ampel springt auf Rot — eine falsche Eskalation. Das System muss "Verfahrensruhe" abbilden: alle aktiven Fristen eines Vorgangs werden gemeinsam pausiert und bei Wiederaufnahme mit korrigierter Restlaufzeit fortgesetzt.

Zentrale Designfrage: Wie wird der Pause-Zustand modelliert — als neuer Wert im bestehenden `status`-Feld oder als separates Boolean `pausiert`? Wie grenzt sich Pause (Vorgangsebene) von Hemmung (Fristebene, PROJ-4 US-5) ab?

## Entscheidung

### 1. `status` um `'pausiert'` erweitern (kein separates Boolean)

Der bestehende CHECK-Constraint auf `vorgang_fristen.status` wird um `'pausiert'` erweitert. Dies folgt dem gleichen Muster wie Hemmung (`status = 'gehemmt'`) und haelt das Zustandsmodell einheitlich: ein Feld, eine Quelle.

### 2. Separate `vorgang_pausen`-Tabelle fuer Pause-Historie

Jede Pause wird als eigener Datensatz in `vorgang_pausen` gespeichert (vorgang_id, begruendung, pause_start, pause_ende, pause_werktage). Dies ermoeglicht:
- Mehrfach-Pause-Historie
- Werktage-Berechnung pro Pause
- Vollstaendiger Audit-Trail

Zusaetzlich erhaelt `vorgang_fristen` ein Feld `pause_tage_gesamt` (kumuliert, analog zu `hemmung_tage`) fuer schnellen Zugriff bei Resume ohne Aggregation.

### 3. Orthogonale Zustaende: Hemmung hat Vorrang

Hemmung (Einzelfrist, fachlicher Grund) und Pause (Vorgang, organisatorischer Grund) sind orthogonale Konzepte:
- Pause setzt nur Fristen mit `status NOT IN ('gehemmt', 'pausiert')` auf `'pausiert'`
- Gehemmte Fristen bleiben waehrend der Pause `'gehemmt'`
- Bei Resume werden nur Fristen mit `status = 'pausiert'` fortgesetzt
- Gehemmte Fristen bleiben nach Resume `'gehemmt'`

### 4. Resume berechnet Ampelstatus neu

Bei Wiederaufnahme wird das Frist-Enddatum um die Pause-Werktage verlaengert und der Ampelstatus anhand der aktuellen Restlaufzeit neu berechnet — nicht der alte Status wiederhergestellt. Dies verhindert falsche Anzeigen nach langer Pause.

### 5. Cron-Job: Filter-Erweiterung statt Logik-Aenderung

Der Cron-Job (PROJ-22) erhaelt einen zusaetzlichen Filter `.neq("status", "pausiert")`. Keine Aenderung an der Berechnungslogik — pausierte Fristen werden einfach uebersprungen.

### 6. Hemmung bei pausierter Frist verboten

Wenn ein Vorgang pausiert ist, darf keine Einzelfrist gehemmt werden (HTTP 409). Fachlich: bei ruhendem Verfahren gibt es keinen Grund, eine Einzelfrist zu hemmen.

## Alternativen verworfen

### Alt-1: Separates Boolean `pausiert` auf `vorgang_fristen`

Ein Boolean `pausiert` haette ein zweites Zustandsmodell eingefuehrt, das mit `status` koordiniert werden muesste. Zustandskombinationen wie `status = 'gelb' AND pausiert = true` waeren semantisch unklar. Ein zusaetzliches Feld `status_vor_pause` waere noetig gewesen. Verworfen wegen Inkonsistenz mit bestehendem Zustandsmodell.

### Alt-2: Pause als Hemmung aller Fristen modellieren

`hemmeFrist()` fuer jede Frist des Vorgangs aufrufen haette keine neuen DB-Strukturen erfordert, aber Hemmung und Pause semantisch vermischt. Bei Resume waere unklar gewesen, welche Fristen durch Pause vs. manuell gehemmt wurden. Verworfen wegen semantischer Vermischung.

### Alt-3: Soft-State auf `vorgaenge` statt `vorgang_pausen`-Tabelle

`vorgaenge.pausiert boolean` + `pausiert_seit timestamptz` waere einfacher, aber ohne Pause-Historie. Mehrfach-Pause (Q-1: ja) und kumulierte Werktage waeren nicht abbildbar. Verworfen wegen fehlender Historie.

### Alt-4: Alten Status bei Resume wiederherstellen statt neu berechnen

`status_vor_pause`-Feld haette die Neuberechnung gespart, aber nach einer 30-Tage-Pause waere ein gespeichertes "gruen" falsch. Verworfen, weil der aktuelle Zustand relevant ist, nicht der historische.

## Konsequenzen

**Positiv:**
- Einheitliches Zustandsmodell (`status`-Enum) fuer Ampel, Hemmung und Pause
- Cron-Job-Aenderung ist eine einzige Zeile (Filter-Erweiterung)
- Vollstaendige Pause-Historie fuer Audit und Nachvollziehbarkeit
- Resume berechnet korrekten Ampelstatus basierend auf tatsaechlicher Restlaufzeit
- Orthogonale Hemmung/Pause verhindert Zustandskollisionen
- Bestehende Werktage-Berechnung (`werktage.ts`) wird wiederverwendet

**Negativ / Risiken:**
- CHECK-Constraint-Aenderung auf `vorgang_fristen` erfordert DROP+ADD (kurzer Lock, akzeptabel bei wenigen Zeilen)
- Partial-Index muss angepasst werden (DROP+CREATE)
- Kein Transaktions-Support in Supabase JS Client — Pause-Anlage und Fristen-Update sind zwei separate Operationen. Bei Teil-Fehler: Pause existiert, aber nicht alle Fristen pausiert. Resume korrigiert diesen Zustand.
- Feiertags-Berechnung ueber Jahreswechsel erfordert Feiertage aus zwei Jahren

## Beteiligte Rollen

- **Senior Software Architect:** Architektur-Design, Zustandsmodell-Entscheidung
- **Database Architect:** Schema-Design, Index-Strategie, CHECK-Constraint
- **Senior Backend Developer:** FristService-Erweiterung, Cron-Anpassung
- **Senior QS Engineer:** Zeittests (Pause + Feiertage, Mehrfach-Pause, Hemmung + Pause)
- **Product Owner:** Scope-Entscheidung US-4 (Dashboard-Hinweis, optional)

## Referenzen

- [PROJ-37 Feature-Spec](../../features/PROJ-37-frist-pause-ruhende-verfahren.md)
- [ADR-003: Service-Kapselung](ADR-003-service-architektur-kapselung.md)
- [ADR-008: Background Jobs](ADR-008-asynchrone-verarbeitung-background-jobs.md)
- [PROJ-4: Fristmanagement](../../features/PROJ-4-fristmanagement.md)
- [PROJ-22: Cron-Job](../../features/PROJ-22-cron-feiertage-fix.md)
