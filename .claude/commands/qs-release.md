---
name: qs-release
description: Erstellt strukturierten QS-Bericht mit Abnahmeempfehlung (Go / No-Go) für /po-review. Aktualisiert features/INDEX.md auf "In Review". Aufruf mit /qs-release [PROJ-X]
---

Lies zuerst:
- Alle Testergebnisse und offene Befunde für das Feature
- Feature-Spec: `features/PROJ-X-*.md`
- `features/INDEX.md`
- `.claude/rules/testing.md` – Qualitätsgates

Agiere als **Senior QS Engineer** gemäß `.claude/agents/senior-qs-engineer.md`.

## Aufgabe
Erstelle Abnahmeempfehlung und strukturierten QS-Bericht.

## Schritte
1. Fasse Qualitätsstatus zusammen (Testabdeckung, offene Befunde)
2. Prüfe Qualitätsgates aus `.claude/rules/testing.md` (nicht verhandelbar):
   - Testabdeckung ≥ 80 % für neue Dateien?
   - RLS-Tests grün? → Fehlschlag = zwingend No-Go
   - Auth-Tests grün?
3. Bewerte offene Befunde nach Kritikalität
4. Formuliere Go / No-Go / Conditional Go mit Begründung
5. Hole Nutzer-Bestätigung bei sicherheitskritischen Befunden (Human-in-the-Loop)
6. Aktualisiere `features/INDEX.md` → Status `In Review`

## QS-Bericht-Format (Übergabe an `/po-review`)
```markdown
## QS-Bericht: [Feature-Name] (PROJ-X)
**Datum:** YYYY-MM-DD
**Testabdeckung:** X %
**RLS-Tests:** ✅ grün / ❌ fehlgeschlagen
**Auth-Tests:** ✅ grün / ❌ fehlgeschlagen

### Offene Befunde
| ID | Schwere | Beschreibung | Reproduktion |
|---|---|---|---|
| B-001 | Kritisch / Major / Minor | ... | ... |

### Abnahmeempfehlung
**Go / No-Go / Conditional Go**
Begründung: [...]
Akzeptierte Restrisiken (bei Conditional Go): [...]
```

## Ausgabe
- QS-Bericht (strukturiert, direkt verwendbar für `/po-review`)
- Aktualisierte `features/INDEX.md`
- **Nächster Schritt:** `/po-review` mit QS-Bericht als Eingabe
