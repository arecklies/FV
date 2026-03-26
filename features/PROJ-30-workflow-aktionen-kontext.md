# PROJ-30: Workflow-Aktionen mit Kontextinformation

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-26

---

## 1. Ziel / Problem

Die Workflow-Aktions-Buttons in der Vorgang-Detailansicht zeigen nur den Label-Text (z.B. "Vollständig") ohne Kontext. Hinweistexte und Checklisten existieren in der Workflow-Definition, werden aber nur im Workflow-Tab angezeigt — nicht direkt bei den Aktions-Buttons. Für Einsteiger (P2) ist unklar, was die Aktion bewirkt.

## 4. User Stories & Akzeptanzkriterien

### US-1: Hinweistext und Checkliste bei Aktions-Buttons
- AC-1: Hinweistext des aktuellen Schritts wird direkt über den Aktions-Buttons angezeigt (nicht nur im Workflow-Tab)
- AC-2: Checkliste (falls vorhanden) wird über den Buttons eingeblendet
- AC-3: Bestehende Darstellung im Workflow-Tab bleibt unverändert

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-3 (Vorgangsverwaltung) | Voraussetzung (Workflow-Definition mit hinweis/checkliste) |

## 11. Scope / Nicht-Scope

**Scope:** Hinweistext + Checkliste ueber Aktions-Buttons in Vorgang-Detail (Uebersicht-Tab oder eigener Abschnitt)
**Nicht-Scope:** Aenderung der Workflow-Definition, neue Datenfelder
