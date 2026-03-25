---
name: kick-off
description: Fuehrt Projekt-Kick-off durch. Alle Kernrollen lesen PRD, ADRs und Feature-Specs und geben strukturierte Statements ab. Ergebnis ist ein konsolidiertes Protokoll. Aufruf mit /kick-off
---

Lies zuerst:
- `docs/PRD.md` -- Produktvision und Roadmap
- `docs/adr/README.md` -- Alle ADRs
- `features/INDEX.md` -- Aktueller Feature-Stand
- Alle Feature-Specs der aktuellen Phase

Agiere als **Moderator** und delegiere an 7 Rollen parallel.

## Aufgabe
Fuehre ein Projekt-Kick-off durch, bei dem alle Kernrollen die Projektdokumente lesen
und ein strukturiertes Statement abgeben. Konsolidiere die Ergebnisse in ein Protokoll.

## Teilnehmer (parallel als Subagenten)
1. **Software Architect** -- ADR-Konsistenz, Abhaengigkeitskette, offene Entscheidungen
2. **Senior Security Engineer** -- BSI/DSGVO-Bewertung, Security-Fundamente, Warnungen
3. **Database Architect** -- Schema-Entwurf, RLS-Strategie, Tabellenreihenfolge
4. **Senior Frontend Developer** -- UI-Architektur, Komponentenbestand, Progressive Disclosure
5. **Senior Backend Developer** -- Service-Schnitt, API-Design, XBau-Verstaendnis
6. **Senior QS Engineer** -- Teststrategie, RLS-Tests, Qualitaetsgates
7. **Senior UI/UX Designer** -- Design-System, Dashboards, Widerspruchs-Loesungen, BITV

## Jede Rolle gibt ab:
1. Projektverstaendnis (2-3 Saetze)
2. Bewertung aus Rollensicht (Staerken, Luecken)
3. Top 3 Risiken
4. Naechste Schritte

## WICHTIG: Subagenten-Schreibzugriff
Die Rollen product-owner, senior-produktmanager, requirements-engineer, migration-architect,
senior-software-architect haben KEINEN Schreibzugriff. Das Protokoll wird im Hauptkontext geschrieben.

## Schritte
1. Starte alle 7 Rollen parallel als Background-Agenten
2. Sammle alle Statements ein
3. Konsolidiere in ein Kick-off-Protokoll mit:
   - Teilnehmer und Anwesenheit
   - Gemeinsames Projektverstaendnis (Konsens)
   - Vereinbarte Build-Reihenfolge
   - Konsolidierte Risiken (dedupliziert, priorisiert)
   - Security-Warnungen (verbindlich)
   - Offene Klaerungspunkte
   - Naechste Schritte je Rolle
4. Speichere als `docs/kick-off-protokoll.md`

## Ausgabe
- Protokoll unter `docs/kick-off-protokoll.md`
- **Naechster Schritt:** Erste offene Klaerungspunkte adressieren (typischerweise `/arch-adr` fuer fehlende ADRs)
