# PROJ-53: Wiedervorlagen mit Erinnerung

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-27
**Herkunft:** Nutzertest Afterwork 14.05.2026, Dr. Petra Hagemann (Soest, P1-SO2)
**Prioritaet:** Hoch (Referatsleiterin hat 200 Outlook-Wiedervorlagen fuer Bauverfahren)

---

## 1. Ziel / Problem

Sachbearbeiter und Referatsleiter verwalten Wiedervorlagen aktuell in Outlook, Excel oder auf Papier. Es fehlt eine systeminterne Moeglichkeit, sich an einem bestimmten Datum an eine Aufgabe zu einem Vorgang erinnern zu lassen -- z.B. "Am 15.06. Stellungnahme des Brandschutzes nachfragen" oder "In 4 Wochen pruefen ob Unterlagen eingegangen sind". Die Wiedervorlagen sind personenbezogen und unabhaengig von gesetzlichen Fristen (PROJ-4).

## 2. Fachlicher Kontext & Stakeholder

- **Referatsleiterin Soest:** 200 Outlook-Wiedervorlagen, will alles in einem System
- **Erfahrene Sachbearbeiter:** Nutzen Outlook-Erinnerungen oder Post-Its am Monitor
- **Berufseinsteiger:** Brauchen Fuehrung -- Wiedervorlagen koennten helfen, Arbeitsablaeufe zu strukturieren
- **Ueberschneidung mit PROJ-29 (Tagesansicht):** Wiedervorlagen als Datenquelle fuer "Mein Tag"

## 3. Funktionale Anforderungen

- FA-1: Wiedervorlage zu einem Vorgang anlegen (Datum + Freitext-Betreff)
- FA-2: Wiedervorlagen in persoenlicher Uebersicht anzeigen (chronologisch, faellige hervorgehoben)
- FA-3: Faellige Wiedervorlagen auf der Startseite / Tagesansicht (PROJ-29) anzeigen
- FA-4: Wiedervorlage als erledigt markieren oder loeschen
- FA-5: Wiedervorlage wiederholen (optional: taegliche/woechentliche Wiederholung)

## 4. User Stories & Akzeptanzkriterien

### US-1: Wiedervorlage anlegen
Als Sachbearbeiter moechte ich eine Wiedervorlage zu einem Vorgang anlegen, damit ich an einem bestimmten Datum an eine Aufgabe erinnert werde.
- AC-1: Im Vorgang gibt es einen Button "Wiedervorlage anlegen"
- AC-2: Pflichtfelder: Datum, Betreff (Freitext, max. 200 Zeichen)
- AC-3: Optionales Feld: Notiz (laengere Beschreibung)
- AC-4: Wiedervorlage wird dem aktuellen Nutzer zugeordnet

### US-2: Faellige Wiedervorlagen sehen
Als Sachbearbeiter moechte ich faellige Wiedervorlagen auf meiner Startseite sehen.
- AC-1: Faellige Wiedervorlagen (heute + ueberfaellig) werden prominent angezeigt
- AC-2: Kuenftige Wiedervorlagen (naechste 5 Werktage) werden in einer separaten Liste gezeigt
- AC-3: Klick auf Wiedervorlage oeffnet den zugehoerigen Vorgang

### US-3: Wiedervorlage erledigen
Als Sachbearbeiter moechte ich eine Wiedervorlage als erledigt markieren.
- AC-1: Checkbox oder Button "Erledigt" auf der Wiedervorlage
- AC-2: Erledigte Wiedervorlagen verschwinden aus der aktiven Liste
- AC-3: Erledigte Wiedervorlagen sind im Vorgang weiterhin sichtbar (Historie)

## 5. Nicht-funktionale Anforderungen

- Ausgabe von `/req-nfr` wird hier eingefuegt.

## 6. Spezialisten-Trigger

- **Database Architect:** Neue Tabelle `wiedervorlagen` mit RLS, Indizes auf `faellig_am` + `user_id`
- **Senior Backend Developer:** API-Routes, Abfrage faelliger Wiedervorlagen
- **Senior Frontend Developer:** UI-Komponente, Integration in Tagesansicht (PROJ-29)

## 7. Offene Fragen

- Sollen Wiedervorlagen E-Mail-Benachrichtigungen ausloesen (Synergie mit PROJ-38)?
- Sollen Wiedervorlagen an andere Nutzer delegierbar sein?
- Wie interagiert Wiedervorlage mit Vertretung (PROJ-35)? Sieht die Vertretung faellige Wiedervorlagen?

## 8. Annahmen

- Wiedervorlagen sind KEINE gesetzlichen Fristen -- sie haben keine Ampel und kein Hemmungsverhalten
- Wiedervorlagen sind persoenlich (nur der Ersteller sieht sie), nicht teambezogen
- DB-Tabelle: `wiedervorlagen (id, vorgang_id, user_id, tenant_id, faellig_am, betreff, notiz, erledigt_am, created_at)`

## 9. Abhaengigkeiten

- PROJ-3 (Vorgangsverwaltung) -- Deployed (Vorgang-Bezug)
- PROJ-29 (Persoenliche Tagesansicht) -- Planned (Wiedervorlagen als Datenquelle)
- PROJ-38 (E-Mail-Benachrichtigungen) -- Planned (moegliche Synergie)
- PROJ-35 (Vertretungsregelung) -- Deployed (Sichtbarkeit bei Vertretung)

## 10. Fachliche Risiken

| Risiko | Auswirkung | Gegenmassnahme |
|--------|-----------|----------------|
| Nutzer erstellen zu viele Wiedervorlagen | Uebersicht geht verloren | Limit pro Vorgang (z.B. 10), ueberfaellige prominent |
| Verwechslung mit gesetzlichen Fristen | Falsche Erwartung an Rechtsverbindlichkeit | Klare visuelle Trennung, kein Ampel-Badge |

## 11. Scope / Nicht-Scope

**Scope:** Wiedervorlage CRUD, persoenliche Uebersicht, Faelligkeit auf Startseite, Erledigt-Status
**Nicht-Scope:** E-Mail-Benachrichtigung (PROJ-38), Delegation an andere Nutzer, wiederkehrende Wiedervorlagen (V2), Team-Wiedervorlagen
