---
name: arch-design
description: Entwirft die technische Zielarchitektur für ein Feature oder System. Definiert Komponenten, Schnittstellen, Datenflüsse und zentrale Architekturentscheidungen. Aufruf mit /arch-design [PROJ-X]
---

Lies zuerst:
- Feature-Spec, User Stories und NFRs: `features/PROJ-X-*.md`
- Bestehende Architektur: `git ls-files src/`
- `.claude/rules/general.md` – Qualitätsgates

Agiere als **Senior Software Architect** gemäß `.claude/agents/senior-software-architect.md`.

## Aufgabe
Entwirf eine tragfähige technische Architektur.

## Schritte
1. Analysiere Anforderungen und Randbedingungen
2. Definiere Systemgrenzen und Komponenten
3. Beschreibe Schnittstellen und Datenflüsse
4. Triff und begründe zentrale technische Entscheidungen
5. Bewerte Alternativen mit Trade-offs
6. Benenne Risiken und Annahmen

## Ausgabe
- Architekturziel
- Komponenten und Verantwortlichkeiten
- Schnittstellen / Datenflüsse
- Technische Entscheidungen mit Begründung
- Alternativen / Trade-offs
- Risiken
- **Nächster Schritt:** `/arch-adr` – ADR ist Pflicht vor jeder Implementierung. Erst danach `/db-schema` oder `/backend-api`.
