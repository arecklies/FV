# PROJ-31: Visuelles Redesign und Branding

**Status:** Deployed | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-26
**Herkunft:** Demo-Test-Feedback ("Das gesamte UI wirkt allerdings sehr langweilig")
**Priorität:** Hoch (hochgestuft 2026-03-27: Feedback diverser Entwurfsverfasser bestätigt Handlungsbedarf)

---

## 1. Ziel / Problem

Die Anwendung nutzt shadcn/ui-Defaults ohne visuelles Branding. Funktional korrekt, aber ohne Persoenlichkeit — wirkt wie ein Prototyp, nicht wie ein Produkt. Fuer Kunden-Demos und Pilotbetrieb muss die Anwendung professionell und vertrauenswuerdig wirken, ohne "overdesigned" zu sein.

## 2. Fachlicher Kontext & Stakeholder

- **Alle Personas:** Erste Eindruecke zaehlen — "sieht modern aus" war positives Kundenfeedback, muss gehalten werden
- **P3 (Referatsleiter):** Repraesentatives Erscheinungsbild fuer interne Praesentationen
- **P4 (Amtsleitung):** Professioneller Auftritt gegenueber politischen Entscheidungstraegern
- **Entwurfsverfasser (extern):** Diverse Architekten/Ingenieure bemängeln das UI als "viel zu funktional" (Feedback 2026-03-27). Diese Gruppe sieht die Software bei Kundendemos und beeinflusst die Kaufentscheidung ihrer Auftraggeber (Bauherren).
- **Umfrage:** 72 Votes fuer Tastaturnavigation (Rang 2) — Power-User brauchen klare visuelle Hierarchie

## 3. Funktionale Anforderungen

- FA-1: Konsistentes Farbschema (behoerden-gerecht, professionell, nicht verspielt)
- FA-2: Verbesserte visuelle Hierarchie (Kopfbereich, Navigation, Inhaltsbereich klar getrennt)
- FA-3: Dashboard-Feeling fuer die Vorgangsliste (nicht nur nackte Tabelle)
- FA-4: Akzentfarben fuer Status und Ampel (konsistent mit bestehendem AmpelBadge)
- FA-5: Branding-faehig (Logo-Platzhalter, Mandanten-Name im Header)

## 4. User Stories & Akzeptanzkriterien

### US-1: Professionelles Erscheinungsbild
Als Sachbearbeiter moechte ich eine Anwendung nutzen, die modern und professionell aussieht.
- AC-1: Konsistentes Farbschema ueber alle Seiten
- AC-2: Klare visuelle Hierarchie (Ueberschriften, Abschnitte, Aktionen)
- AC-3: Angemessener Weissraum (nicht zu eng, nicht zu leer)
- AC-4: Responsive: 375px, 768px, 1440px

### US-2: Vorgangsliste als Dashboard
Als Sachbearbeiter moechte ich die Vorgangsliste als Arbeits-Dashboard wahrnehmen, nicht als Datentabelle.
- AC-1: Statistik-Karten ueber der Tabelle (Gesamt, Fristgefaehrdet, Meine Vorgaenge)
- AC-2: Farbliche Akzente fuer Dringlichkeit (konsistent mit Ampelfarben)

## 5. Nicht-funktionale Anforderungen

- NFR-1: WCAG 2.2 AA Kontraste (min. 4.5:1 fuer Text, 3:1 fuer UI-Elemente)
- NFR-2: Keine neuen Dependencies — nur Tailwind CSS + shadcn/ui
- NFR-3: Dark Mode vorerst nicht (COULD fuer spaeter)

## 6. Spezialisten-Trigger

- **Senior UI/UX Designer:** Design-Konzept und Handoff
- **Senior Frontend Developer:** Implementierung

## 7. Offene Fragen

1. Soll es ein eigenes Logo/Wortmarke geben oder reicht ein Platzhalter?

## 8. Annahmen

- shadcn/ui bleibt die Komponentenbibliothek (Pflicht laut frontend.md)
- Tailwind CSS bleibt das einzige Styling-System

## 9. Abhaengigkeiten

Keine (rein visuell, keine Logik-Aenderungen).

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Overdesign lenkt von Funktionalitaet ab | Mittel | Kunden fokussieren auf Design statt Features | Zurueckhaltend, professionell, nicht verspielt |

## 11. Scope / Nicht-Scope

**Scope:** Farbschema, visuelle Hierarchie, Dashboard-Karten, Header-Branding, Weissraum
**Nicht-Scope:** Dark Mode, Animationen, Custom Icons, Logo-Design
