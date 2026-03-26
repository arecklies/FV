# PROJ-29: Persoenliche Tagesansicht ("Mein Tag")

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-26
**Herkunft:** Kundentermin 26.03.2026, Feedback F-08 (kleine Bauaufsicht + alle Behoerdengroessen)

---

## 1. Ziel / Problem

Sachbearbeiter muessen aktuell zwischen Vorgangsliste, Fristen-Tab und Workflow-Ansicht wechseln, um ihren Arbeitstag zu planen. Es fehlt eine konsolidierte Uebersicht "Was muss ich heute erledigen?". Besonders kleine Behoerden ohne Referatsleiter-Ebene brauchen eine persoenliche Steuerungsansicht statt eines Management-Dashboards. Im Kundentermin wurde dies von allen Behoerdengroessen als nuetzlich bewertet.

## 2. Fachlicher Kontext & Stakeholder

- **P1 (Erfahrener SB):** Will morgens auf einen Blick sehen, was ansteht
- **P2 (Einsteiger):** Braucht Fuehrung: "Was ist dringend? Was muss ich heute tun?"
- **Kleine Behoerde (Kundentermin):** "Kein Dashboard, sondern meine persoenliche Aufgabenliste"
- **Mittlere Behoerde (Kundentermin):** "Ich haette gerne eine Tagesansicht, in der ich meine Woche planen kann"
- **Umfrage:** Tastaturnavigation fuer Power-User (72 Votes, Rang 2) — Tagesansicht ist der ideale Einstiegspunkt

## 3. Funktionale Anforderungen

- FA-1: Persoenliche Startseite (nach Login) mit Tagesuebersicht
- FA-2: Ablaufende Fristen (naechste 5 Werktage, sortiert nach Dringlichkeit)
- FA-3: Zugewiesene Vorgaenge im aktuellen Workflow-Schritt (meine offenen Aufgaben)
- FA-4: Kuerzlich bearbeitete Vorgaenge (letzte 5, fuer schnellen Wiedereinstieg)

## 4. User Stories & Akzeptanzkriterien

### US-1: Tagesuebersicht nach Login
Als Sachbearbeiter moechte ich nach dem Login sofort sehen, was heute ansteht.
- AC-1: Startseite zeigt "Mein Tag" mit 3 Abschnitten: Fristen, Aufgaben, Kuerzlich bearbeitet
- AC-2: Fristen-Abschnitt zeigt Fristen die in den naechsten 5 Werktagen ablaufen, mit Ampel-Badge
- AC-3: Aufgaben-Abschnitt zeigt mir zugewiesene Vorgaenge, gruppiert nach Workflow-Schritt
- AC-4: Klick auf einen Eintrag oeffnet den Vorgang direkt

### US-2: Leere Tagesansicht
Als Sachbearbeiter moechte ich eine hilfreiche Anzeige sehen, wenn nichts Dringendes ansteht.
- AC-1: Empty State: "Keine dringenden Fristen. Alle Vorgaenge im Zeitplan."
- AC-2: Link zur Vorgangsliste und "Neuer Vorgang" Button als Einstieg

## 5. Nicht-funktionale Anforderungen

- NFR-1: Ladezeit der Tagesansicht < 2 Sekunden (aggregiert max. 3 API-Aufrufe)
- NFR-2: Responsiv: Mobile-freundlich (375px), keine horizontale Scroll-Notwendigkeit
- NFR-3: WCAG 2.2 AA (Barrierefreiheit)

## 6. Spezialisten-Trigger

- **Senior UI/UX Designer:** Layout-Konzept, Informationshierarchie, Empty State
- **Senior Frontend Developer:** Komponente, API-Integration, Performance

## 7. Offene Fragen

1. Soll die Tagesansicht die neue Startseite nach Login ersetzen oder als Tab/Link neben der Vorgangsliste existieren?

## 8. Annahmen

- Alle benoetigten Daten sind ueber bestehende APIs verfuegbar (Fristen: PROJ-4, Vorgaenge: PROJ-3)
- Kein neuer Backend-Endpunkt noetig — Frontend aggregiert bestehende APIs
- Alternativ: Ein dedizierter Aggregations-Endpunkt fuer Performance (Entscheidung durch Architekt)

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-4 (Fristmanagement) | Voraussetzung (Fristen-API fuer ablaufende Fristen) |
| PROJ-3 (Vorgangsverwaltung) | Voraussetzung (Vorgaenge-API fuer zugewiesene Aufgaben) |

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Performance bei vielen zugewiesenen Vorgaengen | Niedrig | Langsame Startseite | Limit auf Top-10 je Abschnitt, "Alle anzeigen"-Link |

## 11. Scope / Nicht-Scope

**Scope:** Persoenliche Tagesansicht mit Fristen + Aufgaben + kuerzlich bearbeitet, responsiv, barrierefrei
**Nicht-Scope:** Kalenderansicht (FA-6, eigenes Item), Wiedervorlagen (eigenes Feature), Team-Ansicht (Referatsleiter-Dashboard PROJ-21)
