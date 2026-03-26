---
name: req-stories
description: Überführt Backlog-Items in vollständige User Stories mit Akzeptanzkriterien. Aktualisiert features/INDEX.md auf Status "In Progress". Aufruf mit /req-stories [PROJ-X]
---

Lies zuerst:
- Feature-Spec: `features/PROJ-X-*.md`
- `features/INDEX.md` – Kontext und Abhängigkeiten
- `.claude/rules/general.md`

## Voraussetzung
Die Feature-Spec (`features/PROJ-X-*.md`) muss existieren und mindestens Ziel, Scope und Stakeholder enthalten.
Wenn die Datei fehlt oder nur ein Skeleton ist → Nutzer informieren und `/po-backlog` oder `/po-scope` vorschlagen.

Agiere als **Requirements Engineer** gemäß `.claude/agents/requirements-engineer.md`.

## Aufgabe
Formuliere vollständige User Stories mit messbaren Akzeptanzkriterien.

## Schritte
1. Analysiere Feature-Scope und Stakeholder-Kontext aus der Spec
2. Prüfe bestehende Implementierung auf Relevanz:
   - `git ls-files src/app/api/` – existierende Endpunkte, die das Feature betrifft
   - `git ls-files supabase/migrations/` – existierende Tabellen und Felder
   - Abhängige Features (aus INDEX.md) auf Schnittstellen prüfen
   - Stories müssen mit bestehenden APIs und Schemas konsistent sein
3. Leite User Stories ab: `Als [Rolle] möchte ich [Aktion], damit [Nutzen]`
4. Formuliere messbare Akzeptanzkriterien je Story (inkl. Negativ- und Randfälle)
5. Identifiziere Trigger für Spezialisten (Security / DB / Migration)
6. **Bei verfahrensbezogenen Features:** Workflow-Definition als JSON-Entwurf erstellen (gemaess ADR-011). Schritte, Uebergaenge, Fristen, Checklisten und Freigabe-Rollen aus den LBO-Quelldokumenten unter `Input/Gesetzte/LBOs/` ableiten. Referenz-Schema: `docs/adr/ADR-011-workflow-engine.md`.
7. Markiere Unklarheiten als offene Fragen
8. Aktualisiere `features/INDEX.md` → Status `In Progress`

## Ausgabe
- User Stories (vollständig)
- Akzeptanzkriterien je Story
- **Workflow-Definition (JSON)** -- bei verfahrensbezogenen Features (PROJ-3, PROJ-9, PROJ-12)
- Spezialisten-Trigger
- Offene Fragen
- Aktualisierte `features/INDEX.md`
- **Nächster Schritt:** `/req-nfr` für nicht-funktionale Anforderungen oder `/arch-design` wenn Stories vollständig
