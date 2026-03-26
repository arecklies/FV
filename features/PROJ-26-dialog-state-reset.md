# PROJ-26: Dialog-State-Reset bei erneutem Oeffnen

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-26
**Herkunft:** PROJ-4 Retro Action Item A-7 (minor)

---

## 1. Ziel / Problem

Die Dialoge `FristVerlaengerungDialog` und `FristHemmungDialog` setzen ihren Formular-State nicht zurueck, wenn sie fuer eine andere Frist erneut geoeffnet werden. Alte Eingaben bleiben stehen.

## 2. Fachlicher Kontext & Stakeholder

- **Frontend Developer:** UX-Bug bei Dialog-Wiederverwendung

## 3. Funktionale Anforderungen

- FA-1: Bei jedem Oeffnen eines Dialogs werden Formularfelder zurueckgesetzt
- FA-2: Pattern: `key={frist?.id}` auf dem Dialog oder `useEffect` mit `open`-Dependency

## 4. User Stories & Akzeptanzkriterien

### US-1: Sauberer Dialog-State
- AC-1: Dialog oeffnen, teilweise ausfuellen, schliessen, fuer andere Frist oeffnen → Felder sind leer
- AC-2: Validierungsfehler werden bei erneutem Oeffnen zurueckgesetzt

## 5. Nicht-funktionale Anforderungen

Keine.

## 6. Spezialisten-Trigger

- **Senior Frontend Developer:** Dialog-Fix

## 7. Offene Fragen

Keine.

## 8. Annahmen

Keine.

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-4 (Fristmanagement) | Voraussetzung |

## 10. Fachliche Risiken

Keine.

## 11. Scope / Nicht-Scope

**Scope:** State-Reset in FristVerlaengerungDialog und FristHemmungDialog
**Nicht-Scope:** Andere Dialoge im Projekt
