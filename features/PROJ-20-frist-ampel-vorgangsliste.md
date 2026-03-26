# PROJ-20: Frist-Ampel in Vorgangsliste

**Status:** In Progress | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-26
**Herkunft:** PROJ-4 US-2 AC-1, AC-3 (QS-Review: als separates Item ausgelagert)

---

## 1. Ziel / Problem

Sachbearbeiter muessen aktuell jeden Vorgang einzeln oeffnen, um den Friststatus zu sehen. Die Vorgangsliste zeigt nur den Workflow-Status, nicht die Fristampel. Die Ampel in der Liste ist die zweitwichtigste Stakeholder-Anforderung (Rang 2 aller Personas).

## 2. Fachlicher Kontext & Stakeholder

- **P1 (Erfahrener SB):** Will auf einen Blick sehen, welche Vorgaenge fristgefaehrdet sind
- **P2 (Einsteiger):** Braucht visuelle Orientierung in der Liste
- **P3 (Referatsleiter):** Will nach Dringlichkeit sortieren koennen
- **PROJ-4:** AmpelBadge-Komponente und Ampellogik existieren bereits

## 3. Funktionale Anforderungen

- FA-1: GET /api/vorgaenge Response um `frist_status` (dringendste aktive Frist) erweitern
- FA-2: Ampel-Badge in der Vorgangsliste (Tabelle + Mobile Cards)
- FA-3: Sortierung nach Fristdringlichkeit (neues Sortierfeld)

## 4. User Stories & Akzeptanzkriterien

### US-1: Ampel-Badge in Vorgangsliste
Als Sachbearbeiter moechte ich in der Vorgangsliste den Friststatus jedes Vorgangs sehen.
- AC-1: Ampel-Badge (Farbe + Icon + Text) neben dem Workflow-Status in jeder Zeile (Desktop-Tabelle + Mobile Cards)
- AC-2: Badge zeigt den Status der dringendsten aktiven Frist des Vorgangs
- AC-3: Vorgaenge ohne Fristen zeigen keinen Badge (kein leerer Platzhalter)
- AC-4: API liefert `frist_status` als flaches Feld im Vorgaenge-Response (Entscheidung: flach, nicht verschachtelt — weniger Payload, einfachere Sortierung)
- AC-5: Bestehende AmpelBadge-Komponente aus PROJ-4 wird wiederverwendet (kein neues UI-Element)

### US-2: Sortierung nach Dringlichkeit
Als Sachbearbeiter moechte ich die Liste nach Fristdringlichkeit sortieren koennen.
- AC-1: Neues Sortierfeld "Frist" in der Tabellenkopf-Sortierung
- AC-2: Sortierung: dunkelrot > rot > gelb > gruen > ohne Frist (NULL last)
- AC-3: Standard-Sortierung bleibt "Eingangsdatum absteigend"
- AC-4: Backend: Sortierung ueber berechnetes Feld oder Subquery (kein Client-seitiges Sortieren)

## 5. Nicht-funktionale Anforderungen

- NFR-1: Kein N+1-Query — Frist-Info muss im Vorgaenge-Query mit geladen werden (JOIN oder Subquery)
- NFR-2: Ampel-Badge ist identisch mit PROJ-4 AmpelBadge-Komponente (Wiederverwendung)
- NFR-3: WCAG 2.2 AA: Farbe + Icon + Text (bestehende Komponente erfuellt das bereits)

## 6. Spezialisten-Trigger

- **Senior Backend Developer:** API-Erweiterung GET /api/vorgaenge
- **Senior Frontend Developer:** Ampel-Badge in Vorgangsliste einbinden

## 7. Offene Fragen

~~1. Soll der Frist-Status als separates Feld oder verschachteltes Objekt zurueckgegeben werden?~~ **Geklaert (req-stories):** Flaches Feld `frist_status` (string | null). Begruendung: weniger Payload, einfachere Sortierung, konsistent mit `workflow_schritt_id`.

## 8. Annahmen

- AmpelBadge-Komponente aus PROJ-4 wird wiederverwendet (kein neues UI-Element)
- Performance: JOIN auf vorgang_fristen ist performant dank idx_vorgang_fristen_ampel

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-4 (Fristmanagement) | Voraussetzung (vorgang_fristen, AmpelBadge) |
| PROJ-3 (Vorgangsverwaltung) | Voraussetzung (Vorgangsliste, GET /api/vorgaenge) |

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Performance bei vielen Vorgaengen mit Fristen | Niedrig | Langsame Liste | Index idx_vorgang_fristen_ampel ist vorhanden |

## 11. Scope / Nicht-Scope

**Scope:**
- API-Erweiterung GET /api/vorgaenge (Frist-Info im Response)
- Ampel-Badge in Vorgangsliste (Desktop + Mobile)
- Sortierung nach Dringlichkeit

**Nicht-Scope:**
- Frist-Detail in der Liste (nur Badge, kein Enddatum/Typ)
- Filterung nach Friststatus (kann spaeter ergaenzt werden)
