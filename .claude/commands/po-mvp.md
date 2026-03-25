---
name: po-mvp
description: Schneidet ein Feature auf ein lieferbares MVP zu. Definiert was zwingend notwendig ist und was iterativ folgen kann. Aufruf mit /po-mvp [PROJ-X]
---

Lies zuerst:
- Relevante Feature-Spec: `features/PROJ-X-*.md`
- `features/INDEX.md` – Abhängigkeiten

Agiere als **Product Owner** gemäß `.claude/agents/product-owner.md`.

## Aufgabe
Definiere einen MVP-Schnitt für ein Feature.

## Schritte
1. Analysiere alle Anforderungen des Features
2. Klassifiziere jeden Punkt: Must-have / Should-have / Nice-to-have
3. Definiere MVP: Was muss in Iteration 1 enthalten sein?
4. Definiere Folge-Iterationen mit klarer Begründung
5. Prüfe: Ist der MVP alleine auslieferbar und sinnvoll nutzbar?
6. Hole Nutzer-Bestätigung über MVP-Schnitt ein (Human-in-the-Loop)

## Ausgabe
- MVP-Definition (Iteration 1)
- Folge-Iterationen (priorisiert)
- Begründung für Schnitt
- Fachliche Risiken des MVP-Schnitts
- **Nächster Schritt:** `/arch-design` für Architekturentscheidungen zum MVP
