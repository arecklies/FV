# PROJ-55: Statistik-Karten echtes Filtern statt Sortierung

**Status:** Deployed | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-27
**Herkunft:** Nutzertest Tag 1 (Bestandskunden), 14.05.2026, Ralf Meier (Dortmund, P1-DO1)
**Typ:** Quick-Fix (Korrektur zu PROJ-50)

---

## 1. Ziel / Problem

PROJ-50 hat Statistik-Karten als klickbare Schnellfilter implementiert, aber als Sortierung statt echtem Filtern. Im Nutzertest erwarten Bestandskunden bei Klick auf "Ueberfaellig" dass NUR ueberfaellige Vorgaenge angezeigt werden -- nicht alle Vorgaenge umsortiert. Die PROJ-50 Spec hatte "Echtes Filtern" explizit als Nicht-Scope definiert. Der Nutzertest zeigt: diese Entscheidung war falsch.

> Ralf (Dortmund): "Die Statistik-Karten oben -- kann man die anklicken? Ah, die sortieren! Das ist gut. Aber ich haette erwartet, dass sie filtern. Wenn ich auf 'ueberfaellig' klicke, will ich NUR die ueberfaelligen sehen, nicht die ganze Liste anders sortiert."

## 2. Fachlicher Kontext & Stakeholder

- **Grosse Kommunen (Dortmund, ~800 Vorgaenge):** Sortierung hilft nicht bei grossen Listen -- Filtern reduziert die Menge
- **Alle Bestandskunden:** 6/8 bewerteten Statistik-Karten positiv, aber 3/8 erwarteten Filter statt Sortierung
- **Einsteiger (Tag 2):** Nur 2/6 erkannten Karten als klickbar; wenn, dann erwarteten sie Filter

## 3. Funktionale Anforderungen

- FA-1: Klick auf Statistik-Karte filtert die Vorgangsliste (zeigt nur passende Vorgaenge)
- FA-2: Aktiver Filter wird visuell hervorgehoben (aktive Karte, ggf. Badge "X zum Aufheben")
- FA-3: Erneuter Klick auf aktive Karte hebt den Filter auf (Toggle-Verhalten)
- FA-4: Gefilterte Anzahl wird in der Karte oder der Liste angezeigt

## 4. User Stories & Akzeptanzkriterien

### US-1: Statistik-Karte filtert statt sortiert
Als Sachbearbeiter moechte ich bei Klick auf eine Statistik-Karte nur die entsprechenden Vorgaenge sehen.
- AC-1: Klick auf "Ueberfaellig" zeigt NUR Vorgaenge mit Ampelstatus dunkelrot/rot
- AC-2: Klick auf "Fristgefaehrdet" zeigt NUR Vorgaenge mit Ampelstatus gelb
- AC-3: Klick auf "Im Zeitplan" zeigt NUR Vorgaenge mit Ampelstatus gruen
- AC-4: Klick auf "Vorgaenge gesamt" zeigt alle (Reset-Funktion)
- AC-5: Aktive Karte hat visuellen Ring/Hervorhebung (bestehendes active-state aus PROJ-50 beibehalten)
- AC-6: Erneuter Klick auf aktive Karte hebt Filter auf
- AC-7: Karten sind weiterhin per Tastatur erreichbar (Tab + Enter/Space)
- AC-8: Volltextsuche (PROJ-49) und Karten-Filter wirken kombiniert (AND-Verknuepfung)

## 5. Nicht-funktionale Anforderungen

- Ausgabe von `/req-nfr` wird hier eingefuegt.

## 6. Spezialisten-Trigger

- **Senior Frontend Developer:** Filter-Logik in Vorgangsliste, State Management

## 7. Offene Fragen

- Keine -- Scope ist klar definiert.

## 8. Annahmen

- Bestehende Sortier-Logik aus PROJ-50 wird durch Filter-Logik ersetzt (nicht parallel)
- Ampelstatus ist bereits auf jedem Vorgang berechnet (PROJ-20, Deployed)
- Keine neue API-Route noetig -- Filterung erfolgt client-seitig auf bereits geladenen Daten

## 9. Abhaengigkeiten

- PROJ-50 (Statistik-Karten als Schnellfilter) -- Deployed (wird korrigiert)
- PROJ-49 (Volltextsuche) -- Deployed (Kombination mit Filter)
- PROJ-20 (Frist-Ampel) -- Deployed (Ampelstatus als Filterbasis)

## 10. Fachliche Risiken

| Risiko | Auswirkung | Gegenmassnahme |
|--------|-----------|----------------|
| Keine -- kleiner Scope | -- | -- |

## 11. Scope / Nicht-Scope

**Scope:** Filter statt Sortierung bei Statistik-Karten-Klick, Toggle-Verhalten, AND mit Volltextsuche
**Nicht-Scope:** Mehrfach-Filter (mehrere Karten gleichzeitig aktiv), erweiterte Filterleiste, serverseitige Filterung
