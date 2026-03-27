# PROJ-46: Workflow-Bestätigungsdialog

**Status:** Deployed | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-28
**Herkunft:** UX-Beobachtung UX-1, Kunden-Session 28.03.2026
**Prioritaet:** Kritisch

---

## 1. Ziel / Problem

Workflow-Aktionen (z.B. "Bescheid erstellen", "Freigeben") werden sofort ohne Bestaetigung ausgefuehrt. Ein Sachbearbeiter klickte versehentlich auf eine Aktion und konnte den Statuswechsel nicht rueckgaengig machen. In einer Behoerdenumgebung hat jede Statusaenderung rechtliche Relevanz — ein Bestaetigungsdialog ist Pflicht.

Aktuell: `onClick={() => handleWorkflowAktion(a.id)}` in `src/app/vorgaenge/[id]/page.tsx` (Zeile 734) — direkte Ausfuehrung ohne Rueckfrage.

## 2. Fachlicher Kontext & Stakeholder

- **P1 (Sachbearbeiter):** "Ich wollte nur schauen was passiert — jetzt ist der Status geaendert"
- **P3 (Referatsleiter):** Irreversible Statuswechsel ohne Bestaetigung sind ein Risiko
- **AlertDialog:** shadcn/ui-Komponente ist installiert (`src/components/ui/alert-dialog.tsx`)
- **Bestehendes Pattern:** Vertretungsverwaltung (`src/components/vertretungen/stellvertreter-verwaltung.tsx`, Zeile 369-404) nutzt AlertDialog fuer Loeschbestaetigung

## 3. Funktionale Anforderungen

- FA-1: Jede Workflow-Aktion erfordert Bestaetigung ueber AlertDialog vor Ausfuehrung
- FA-2: Dialog zeigt Zielstatus-Label und beschreibt die Konsequenz
- FA-3: Bei Freigabe-Aktionen (typ="freigabe"): Zusaetzlicher Warnhinweis
- FA-4: Bei Zurueckweisungen: Dialog-Ton anpassen (nicht destruktiv, aber deutlich)

## 4. User Stories & Akzeptanzkriterien

### US-1: Bestaetigungsdialog vor Workflow-Aktion

**Als** Sachbearbeiter **moechte ich** vor jeder Workflow-Aktion einen Bestaetigungsdialog sehen, **damit** ich versehentliche Statuswechsel vermeide.

- AC-1: Klick auf einen Workflow-Aktions-Button oeffnet einen AlertDialog statt die Aktion sofort auszufuehren
- AC-2: Dialog-Titel: "Workflow-Aktion ausfuehren?"
- AC-3: Dialog-Text enthaelt das Zielstatus-Label: "Der Vorgang wechselt zu: **[Zielschritt-Label]**. Moechten Sie fortfahren?"
- AC-4: Button "Ausfuehren" fuehrt die Aktion aus (ruft `handleWorkflowAktion` auf)
- AC-5: Button "Abbrechen" schliesst den Dialog ohne Aktion
- AC-6: Waehrend der Ausfuehrung zeigt der "Ausfuehren"-Button einen Ladeindikator und ist disabled
- AC-7: Nach erfolgreicher Ausfuehrung schliesst der Dialog automatisch
- AC-8: Bei Fehler bleibt der Dialog offen und zeigt die Fehlermeldung

### US-2: Warnhinweis bei Freigabe-Aktionen

**Als** Referatsleiter **moechte ich** bei Freigabe-Aktionen (Freizeichnung) einen zusaetzlichen Warnhinweis sehen, **damit** ich mir der Tragweite bewusst bin.

- AC-1: Wenn die aktuelle Workflow-Schritt-Typ `freigabe` ist, enthaelt der Dialog den Zusatztext: "Hinweis: Freigabe-Aktionen haben rechtliche Relevanz und koennen nicht ohne weiteres rueckgaengig gemacht werden."
- AC-2: Der "Ausfuehren"-Button bei Freigabe-Aktionen hat die Variante `destructive` (roter Hintergrund)
- AC-3: Bei normalen (nicht-Freigabe) Aktionen bleibt der Button in der Standard-Variante

### US-3: Tastaturzugaenglichkeit

**Als** Power-User **moechte ich** den Bestaetigungsdialog per Tastatur bedienen koennen, **damit** mein Arbeitsfluss nicht unterbrochen wird.

- AC-1: Dialog kann mit `Escape` geschlossen werden (Abbrechen)
- AC-2: "Ausfuehren"-Button ist per `Tab` erreichbar und mit `Enter` ausloesbar
- AC-3: Fokus liegt beim Oeffnen auf "Abbrechen" (sicherer Default, verhindert versehentliches Enter)
- AC-4: ARIA-Labels: AlertDialogTitle und AlertDialogDescription sind korrekt gesetzt

## 5. Nicht-funktionale Anforderungen

- NFR-1: Keine Backend-Aenderung — reine Frontend-Implementierung
- NFR-2: AlertDialog-Pattern konsistent mit bestehendem Pattern in Vertretungsverwaltung
- NFR-3: Dialog-Oeffnung < 16ms (keine Netzwerk-Requests vor dem Dialog)
- NFR-4: Barrierefreiheit: WCAG 2.2 Level AA (AlertDialog ist nativ accessible via Radix UI)

## 6. Spezialisten-Trigger

- **Senior Frontend Developer:** AlertDialog-Integration in Workflow-Buttons (`src/app/vorgaenge/[id]/page.tsx`)

Kein DB-, Security- oder Backend-Trigger erforderlich.

## 7. Offene Fragen

Keine — Scope ist klar abgegrenzt.

## 8. Annahmen

- AlertDialog aus shadcn/ui (Radix-basiert) deckt ARIA-Anforderungen ab
- Workflow-Schritt-`typ` ist im Frontend-State verfuegbar (ueber `workflow.aktueller_schritt`)
- Das Zielschritt-Label ist in der Aktion enthalten (Feld `label` auf der WorkflowAktion)

## 9. Abhaengigkeiten

- PROJ-3 (Vorgangsverwaltung): Workflow-Tab in Vorgang-Detail — Deployed
- PROJ-33 (Vier-Augen-Lite): Freigabe-Aktionen — Deployed
- PROJ-35 (Vertretungsregelung): Stellvertreter-Freigabe, AlertDialog-Pattern — Deployed

## 10. Fachliche Risiken

| Risiko | Auswirkung | Gegenmassnahme |
|---|---|---|
| Dialog wird als stoerend empfunden | SB klicken genervt durch | Dialog ist minimal (2 Klicks), kein Freitext noetig |
| Zielstatus-Label nicht verfuegbar | Dialog zeigt keinen Kontext | Fallback auf Aktions-Label statt Zielschritt-Label |

## 11. Scope / Nicht-Scope

**Scope:**
- AlertDialog vor jeder Workflow-Aktion im Vorgang-Detail
- Zielstatus-Label im Dialog
- Zusaetzlicher Warnhinweis bei Freigabe-Aktionen
- Tastaturzugaenglichkeit (Escape, Tab, Enter)

**Nicht-Scope:**
- Undo-Funktion (Phase 2, komplexe Workflow-Rueckabwicklung)
- Bestaetigungsdialog fuer Pause/Fortsetzen (PROJ-37, eigenes Pattern mit Dialog)
- Bestaetigungsdialog fuer Massenoperationen (PROJ-17, eigener Scope)
