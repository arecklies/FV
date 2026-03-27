# PROJ-39: Wizard Vorgangsanlage (Schritt-fuer-Schritt)

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-27
**Herkunft:** Kunden-Session 27.03.2026, F-04 (Frau Nguyen, Leipzig, P2)
**Prioritaet:** Mittel

---

## 1. Ziel / Problem

Das Vorgangsanlage-Formular zeigt alle Felder auf einmal. Berufseinsteiger sind ueberfordert und muessen erfahrene Kollegen fragen, was in welches Feld gehoert. Ein schrittweiser Wizard reduziert die kognitive Last und fuehrt durch die Anlage.

## 2. Fachlicher Kontext & Stakeholder

- **P2 (Berufseinsteigerin, Leipzig):** "Zu viele Felder auf einmal. Kann man das in Schritte aufteilen?"
- **P1 (Erfahrener SB):** Will weiterhin schnell anlegen koennen — kein Zwangs-Wizard
- **PRD Design-Prinzip 1:** "Show less, offer more" — Progressive Disclosure
- **PROJ-3:** Vorgangsverwaltung — Anlageformular wird erweitert

## 3. Funktionale Anforderungen

- FA-1: Vorgangsanlage als mehrstufiger Wizard (3-4 Schritte)
- FA-2: Schritt 1: Verfahrensart und Bundesland (bestimmt Folgefelder)
- FA-3: Schritt 2: Antragsteller und Grundstueck
- FA-4: Schritt 3: Bauvorhaben-Details (kontextabhaengig von Verfahrensart)
- FA-5: Schritt 4: Zusammenfassung und Anlage
- FA-6: Erfahrene Nutzer koennen zwischen Wizard und Einzelformular umschalten
- FA-7: Jeder Schritt validiert vor dem Weiter-Button

## 4. User Stories & Akzeptanzkriterien

### US-1: Vorgang schrittweise anlegen
Als Berufseinsteiger moechte ich einen neuen Vorgang in gefuehrten Schritten anlegen, damit ich nichts vergesse und nicht ueberfordert bin.
- AC-1: Wizard mit Fortschrittsanzeige (Schritt X von Y)
- AC-2: Zurueck-Navigation ohne Datenverlust
- AC-3: Pflichtfelder je Schritt markiert
- AC-4: Kontexthilfe (Tooltip oder Hilfetext) bei fachspezifischen Feldern

### US-2: Schnellanlage fuer erfahrene Nutzer
Als erfahrener Sachbearbeiter moechte ich weiterhin alle Felder auf einer Seite sehen, damit ich schnell arbeiten kann.
- AC-1: Toggle "Schnellanlage" zeigt alle Felder auf einer Seite (bisheriges Verhalten)
- AC-2: Praeferenz wird im Nutzerprofil gespeichert

## 5. Nicht-funktionale Anforderungen

- NFR-1: Wizard-Schritte laden unter 500ms (keine Server-Roundtrips zwischen Schritten)
- NFR-2: Auto-Save zwischen Schritten (PROJ-3 Frontend-NFR: kein Datenverlust)
- NFR-3: Barrierefreiheit: Wizard-Navigation per Tastatur und Screenreader

## 6. Spezialisten-Trigger

- **Senior UI/UX Designer:** Wizard-Konzept, Schritt-Aufteilung, Progressive Disclosure
- **Senior Frontend Developer:** Wizard-Komponente, State Management
- **Senior QS Engineer:** Usability-Test mit P2-Persona

## 7. Offene Fragen

- Q-1: Wie viele Schritte sind optimal? (UX-Research noetig)
- Q-2: Sollen die Schritte je Verfahrensart unterschiedlich sein?
- Q-3: Standard-Modus fuer neue Nutzer: Wizard oder Schnellanlage?

## 8. Annahmen

- A-1: PROJ-3 (Vorgangsverwaltung) ist deployed
- A-2: Bestehende Felder und Validierung bleiben identisch
- A-3: Kein neues Backend noetig — rein Frontend-seitige Aenderung

## 9. Abhaengigkeiten

- **PROJ-3** (Vorgangsverwaltung): Basis-Formular wird umgebaut
- **PROJ-36** (Aktenzeichen): Neues Feld muss im Wizard beruecksichtigt werden

## 10. Fachliche Risiken

| Risiko | Auswirkung | Gegenmassnahme |
|---|---|---|
| Erfahrene SB empfinden Wizard als Behinderung | Akzeptanzverlust bei P1 | Schnellanlage-Toggle als gleichwertiger Modus |
| Wizard-Schritte passen nicht zu allen Verfahrensarten | Felder im falschen Schritt | UX-Konzept mit Fachexperten validieren |

## 11. Scope / Nicht-Scope

**Scope:**
- Mehrstufiger Wizard fuer Vorgangsanlage
- Schnellanlage-Toggle fuer erfahrene Nutzer
- Kontexthilfe je Feld
- Auto-Save zwischen Schritten

**Nicht-Scope:**
- Verfahrensart-spezifische Wizard-Varianten (MVP: ein Wizard fuer alle)
- KI-gestuetzte Feldbefuellung
- Onboarding-Tutorial (bleibt in PROJ-16)
