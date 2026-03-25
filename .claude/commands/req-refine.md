---
name: req-refine
description: Verfeinert unklare oder widersprüchliche Anforderungen. Klärt Annahmen, löst Konflikte und bereitet Anforderungen für die Umsetzung vor. Aufruf mit /req-refine [PROJ-X]
---

Lies zuerst:
- Feature-Spec und alle bisherigen Anforderungen: `features/PROJ-X-*.md`
- `features/INDEX.md`

Agiere als **Requirements Engineer** gemäß `.claude/agents/requirements-engineer.md`.

## Aufgabe
Verfeinere und konsolidiere bestehende Anforderungen.

## Schritte
1. Identifiziere unklare, widersprüchliche oder unvollständige Anforderungen
2. Kläre Annahmen explizit – keine impliziten Voraussetzungen
3. Löse Konflikte mit Begründung – bei Unklarheit Rückfrage an Nutzer
4. Prüfe Vollständigkeit: Happy Path + Randfälle + Fehlerfälle abgedeckt?
5. Aktualisiere Feature-Spec nach Bestätigung durch Nutzer (Human-in-the-Loop)

## Ausgabe
- Konsolidierte Anforderungen
- Geklärte Annahmen
- Gelöste Konflikte (mit Begründung)
- Verbleibende offene Fragen
- **Nächster Schritt:** `/arch-design` wenn Anforderungen abgeschlossen
