---
name: meta-optimize
description: Reflektiert vergangene Interaktionen, identifiziert Reibungspunkte im Agenten-/Skill-/Rules-System und schlägt konkrete Verbesserungen an .claude/rules/* oder .claude/skills/*/SKILL.md vor. Änderungen werden nie automatisch angewendet – immer Human-in-the-Loop. Aufruf mit /meta-optimize
---

Lies zuerst:
- `CLAUDE.md` – Gesamtstruktur und Qualitätsgates
- `.claude/rules/general.md` – Commit-Format, Qualitätsgates, INDEX.md-Pflege
- Alle Dateien unter `.claude/rules/`
- Alle Dateien unter `.claude/skills/` die in der letzten Arbeitsphase betroffen waren

Agiere als **Senior Software Architect** gemäß `.claude/agents/senior-software-architect.md`
in Zusammenarbeit mit **Technical Writer** gemäß `.claude/agents/technical-writer.md`.

## Aufgabe
Analysiere die zurückliegende Arbeitsphase auf Reibungspunkte im Agenten-,
Skill- und Rules-System und schlage konkrete, begründete Verbesserungen vor.

## Schritte

### 1. Analyse
Untersuche die letzte Arbeitsphase auf folgende Muster:

**Wiederholte Korrekturen**
- Musste der Nutzer denselben Fehler mehrfach korrigieren?
- Welche Regel fehlte oder war zu unspezifisch?

**Unklarheiten und Widersprüche**
- Gab es Momente, in denen geraten werden musste, weil `.claude/rules/`
  widersprüchlich oder lückenhaft war?
- Welche Übergabe war unklar oder fehlte?

**Workflow-Bremsen**
- Gibt es manuelle Schritte, die ein neuer Skill beschleunigen würde?
- Gibt es Skills, deren Schritte regelmäßig übersprungen werden?
- Gibt es Regeln, die in der Praxis nie angewendet werden?

### 2. Hypothese
Formuliere je Befund eine konkrete Verbesserungshypothese:
- „Wenn Regel X in `.claude/rules/backend.md` präzisiert wird, vermeidet das Fehler Y."
- „Ein neuer Skill `/skillname` würde Schritt Z automatisieren."
- „Die Übergabe zwischen Rolle A und Rolle B ist unvollständig – Ergänzung nötig."

### 3. Umsetzungsvorschlag
Erstelle für jeden Befund einen konkreten Änderungsvorschlag:
- **Regel-Update**: Präzisierung oder Ergänzung in `.claude/rules/*.md`
- **Skill-Verbesserung**: Optimierung der Prompt-Struktur in `.claude/skills/*.md`
- **Neuer Skill**: Vollständige Skill-Datei nach bestehendem Standard
- **Agenten-Ergänzung**: Fehlende Übergabepunkte in `.claude/agents/*.md`
- **CLAUDE.md-Update**: Neue Skills in Tabelle und Workflow-Abschnitt eintragen

Halte Änderungen minimal und begründet – kein Overengineering.

## Human-in-the-Loop (zwingend)
- Jede Änderung an `CLAUDE.md` oder `.claude/` erfordert explizite Nutzer-Bestätigung
- Format: „Soll ich diese Optimierung anwenden? [Ja / Nein / Anpassen]"
- Änderungen werden erst nach Bestätigung geschrieben
- Nie mehrere Änderungen auf einmal anwenden – eine nach der anderen bestätigen lassen

## Commit-Format
```
meta(SYS): <beschreibung der optimierung>
```
Beispiele:
```
meta(SYS): add missing RLS check step to backend-api skill
meta(SYS): clarify dual-write rule in migration.md
meta(SYS): add db-quick-check skill for RLS policy verification
```

## Ausgabe
Je identifiziertem Problem:
1. **Problem:** Kurzbeschreibung des Reibungspunkts
2. **Betroffene Datei:** Pfad
3. **Vorgeschlagene Änderung:** Konkreter Diff oder vollständiger neuer Inhalt
4. **Begründung:** Warum hilft diese Änderung bei zukünftiger Arbeit?
5. **Bestätigung erforderlich:** „Soll ich diese Optimierung anwenden?"

**Nächster Schritt:** Nach Bestätigung aller Änderungen `/docs-adr` falls eine
Architekturentscheidung dokumentiert werden soll, sonst kein weiterer Schritt.
