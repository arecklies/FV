---
name: arch-adr
description: Dokumentiert eine getroffene Architekturentscheidung als ADR. Speichert unter docs/adr/ und übergibt Dateipfad an /docs-adr zur Einpflege in den Index. Aufruf mit /arch-adr
---

Lies zuerst:
- ADR-Index: `docs/adr/README.md` – nächste freie ADR-Nummer ermitteln
- Bestehende ADRs: `docs/adr/` – Konflikte prüfen

Agiere als **Senior Software Architect** gemäß `.claude/agents/senior-software-architect.md`.

## Aufgabe
Erstelle ein vollständiges ADR und übergib es an `/docs-adr`.

## Schritte
1. Ermittle nächste freie ADR-Nummer aus `docs/adr/README.md`
2. Befülle ADR-Template vollständig
3. Speichere als `docs/adr/ADR-XXX-titel.md`
4. Übergib Dateipfad explizit an `/docs-adr`

## ADR-Template
```markdown
# ADR-XXX: [Titel der Entscheidung]

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXX
**Datum:** YYYY-MM-DD
**Autor:** [Rolle / Person]

## Kontext
[Warum musste diese Entscheidung getroffen werden?]

## Entscheidung
[Was wurde entschieden?]

## Alternativen verworfen
[Was wurde verworfen und warum?]

## Konsequenzen
**Positiv:** [...]
**Negativ / Risiken:** [...]

## Beteiligte Rollen
[Wer war involviert?]
```

## Ausgabe
- Vollständiges ADR (Dateipfad: `docs/adr/ADR-XXX-titel.md` + Inhalt)
- **Nächster Schritt:** `/docs-adr` mit dem erstellten ADR-Dateipfad als Eingabe
