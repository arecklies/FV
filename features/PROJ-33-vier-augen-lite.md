# PROJ-33: Vier-Augen-Lite (einfache Freigabe)

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-27
**Herkunft:** Zoom-Demo 27.03.2026, Pilotblocker Soest + Leipzig
**Vorgezogen aus:** PROJ-9 (Vier-Augen-Freigabeworkflow, Phase 2)

---

## 1. Ziel / Problem

Pilotbehoerden Soest und Leipzig blockieren den Pilotstart, weil Bescheide ohne Freigabe durch den Referatsleiter versendet werden koennen. Das verstoesst gegen die behoerdeninterne Zeichnungspflicht. PROJ-33 implementiert eine einfache zweistufige Freigabe als Minimal-Loesung.

## 2. Fachlicher Kontext & Stakeholder

- **P1 (Sachbearbeiter):** Erstellt Bescheide, reicht zur Freigabe ein
- **P3 (Referatsleiter):** Zeichnet Bescheide frei oder weist zurueck
- **Pilotbehoerden Soest, Leipzig:** Pilotblocker ohne Freigabe

## 3. Funktionale Anforderungen

- FA-1: Sachbearbeiter reicht Bescheid zur Freigabe ein (Workflow-Schritt "Freigabe ausstehend")
- FA-2: Referatsleiter sieht alle zur Freigabe eingereichten Bescheide
- FA-3: Referatsleiter kann freigeben (Workflow geht weiter) oder zurueckweisen (zurueck zu Bescheiderstellung)
- FA-4: Zurueckweisung mit Begruendungspflicht
- FA-5: Audit-Trail fuer alle Freigabe-Aktionen

## 4. User Stories & Akzeptanzkriterien

### US-1: Bescheid freigeben oder zurueckweisen
Als Referatsleiter moechte ich Bescheide vor dem Versand freigeben oder mit Begruendung zurueckweisen.
- AC-1: Freigabe-Button nur fuer Referatsleiter oder hoeher sichtbar
- AC-2: Zurueckweisung mit Begruendungsfeld (Pflicht, min. 10 Zeichen)
- AC-3: Freigabe/Zurueckweisung im Audit-Trail protokolliert (User, Zeit, Aktion, Begruendung)
- AC-4: Nach Freigabe wechselt Vorgang in naechsten Workflow-Schritt
- AC-5: Nach Zurueckweisung wechselt Vorgang zurueck zu "Bescheiderstellung", SB sieht Begruendung

## 5. Nicht-funktionale Anforderungen

- NFR-1: Freigabe-Aktion max. 500ms UI-Response
- NFR-2: WCAG 2.2 AA fuer Freigabe-Dialog

## 6. Spezialisten-Trigger

- **Senior Backend Developer:** Workflow-Schritt + Freigabe-Logik
- **Senior Security Engineer:** Rollenbasierter Zugriff, Audit-Trail

## 7. Offene Fragen

Keine — Freigabe gilt pro Vorgang (nicht pro Dokument), Rolle "referatsleiter" existiert bereits (ADR-002).

## 8. Annahmen

- Workflow-Definition (ADR-011) unterstuetzt bereits Freigabe-Schritte (`typ: "freigabe"`, `minRolle: "referatsleiter"`)
- Bestehende Vorgaenge behalten bisherigen Workflow, neuer Schritt nur fuer neue Vorgaenge

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-3 (Vorgangsverwaltung) | Voraussetzung (Workflow-Engine) |
| ADR-011 (Workflow Engine) | freigabe-Schritt-Typ existiert |
| ADR-002 (RBAC) | requireRole("referatsleiter") existiert |

## 10. Fachliche Risiken

Keine — Workflow-Freigabe-Typ ist bereits implementiert (BG-0006 in Demo nutzt ihn).

## 11. Scope / Nicht-Scope

**Scope:** Zweistufige Freigabe, Zurueckweisung mit Begruendung, Audit-Trail
**Nicht-Scope:** Eskalationsketten, Vertretungslogik, Mehrfach-Freigabe, konfigurierbare Regeln (bleibt PROJ-9 Phase 2)
