---
name: arch-review
description: Prüft eine bestehende oder geplante Architektur auf Qualität, Risiken, Konsistenz und Abweichungen von der Zielarchitektur. Aufruf mit /arch-review [PROJ-X oder Dateipfad]
---

Lies zuerst:
- Relevante Feature-Spec: `features/PROJ-X-*.md`
- Bestehende Architektur: `git ls-files src/`
- ADR-Index: `docs/adr/README.md`

Agiere als **Senior Software Architect** gemäß `.claude/agents/senior-software-architect.md`.

## Aufgabe
Führe ein Architektur-Review durch.

## Schritte
1. Prüfe Konsistenz mit bestehenden Architekturprinzipien und ADRs
2. Identifiziere Abweichungen vom Zielarchitektur-Bild
3. Bewerte technische Schulden und Risiken
4. Prüfe NFR-Erfüllung (Skalierbarkeit, Testbarkeit, Wartbarkeit)
5. Empfehle konkrete Verbesserungen mit Priorisierung

## Ausgabe
- Architektur-Befunde (kritisch / major / minor)
- Technische Schulden
- Empfehlungen mit Priorisierung
- **Nächster Schritt:** `/arch-adr` bei grundlegenden Entscheidungsbedarfen oder `/backend-api` bei klarem Umsetzungsauftrag
