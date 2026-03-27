# PROJ-46: Workflow-Bestätigungsdialog

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-28
**Herkunft:** UX-Beobachtung UX-1, Kunden-Session 28.03.2026
**Prioritaet:** Kritisch

---

## 1. Ziel / Problem

Workflow-Aktionen (z.B. "Bescheid erstellen", "Freigeben") werden sofort ohne Bestätigung ausgeführt. Ein Sachbearbeiter klickte versehentlich auf eine Aktion und konnte den Statuswechsel nicht rückgängig machen. In einer Behördenumgebung hat jede Statusänderung rechtliche Relevanz — ein Bestätigungsdialog ist Pflicht.

## 2. Fachlicher Kontext & Stakeholder

- **P1 (Sachbearbeiter):** "Ich wollte nur schauen was passiert — jetzt ist der Status geändert"
- **P3 (Referatsleiter):** Irreversible Statuswechsel ohne Bestätigung sind ein Risiko
- **AlertDialog:** shadcn/ui-Komponente ist installiert, wird in Vertretungsverwaltung bereits genutzt

## 3. Funktionale Anforderungen

- FA-1: Jede Workflow-Aktion erfordert Bestätigung über AlertDialog
- FA-2: Dialog zeigt Zielstatus und Konsequenz ("Vorgang wechselt zu: Bescheid erstellen")
- FA-3: Optional: 30-Sekunden-Undo per Toast nach Ausführung

## 4. User Stories & Akzeptanzkriterien

### US-1: Workflow-Aktion bestätigen
Als Sachbearbeiter möchte ich vor jeder Workflow-Aktion eine Bestätigung sehen, damit ich versehentliche Statuswechsel vermeide.
- AC-1: AlertDialog mit Zielstatus-Label und "Ausführen"/"Abbrechen"-Buttons
- AC-2: Dialog-Titel: "Workflow-Aktion ausführen?"
- AC-3: Dialog-Text: "Der Vorgang wechselt zu: [Zielstatus-Label]. Möchten Sie fortfahren?"
- AC-4: Bei Freigabe-Aktionen: Zusätzlicher Hinweis "Diese Aktion kann nicht rückgängig gemacht werden."

## 6. Spezialisten-Trigger

- **Senior Frontend Developer:** AlertDialog-Integration in Workflow-Buttons
- **Senior UI/UX Designer:** Dialog-Design, Undo-Pattern

## 9. Abhaengigkeiten

- PROJ-3 (Vorgangsverwaltung): Workflow-Buttons in Vorgang-Detail
- PROJ-33 (Vier-Augen-Lite): Freigabe-Aktionen besonders kritisch

## 11. Scope / Nicht-Scope

**Scope:** AlertDialog vor jeder Workflow-Aktion, klarer Zielstatus
**Nicht-Scope:** Undo-Funktion (Phase 2, komplexe Workflow-Rückabwicklung)
