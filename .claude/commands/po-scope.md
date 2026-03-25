---
name: po-scope
description: Klärt und entscheidet Scope und Nicht-Scope für ein konkretes Feature oder Vorhaben. Verhindert Scope Creep und setzt klare MVP-Grenzen. Aufruf mit /po-scope [PROJ-X]
---

Lies zuerst:
- Relevante Feature-Spec: `features/PROJ-X-*.md`
- `features/INDEX.md` – Abhängigkeiten zu anderen Features
- `.claude/rules/general.md`

Agiere als **Product Owner** gemäß `.claude/agents/product-owner.md`.

## Aufgabe
Definiere verbindlich Scope und Nicht-Scope für ein Feature.

## Schritte
1. Lies `features/INDEX.md` und alle bestehenden Feature-Specs
2. Prüfe ob die Anforderung bereits durch ein bestehendes Feature abgedeckt ist → falls ja, Nutzer informieren statt neues Item anlegen
3. Trenne klar: Was ist im Scope? Was explizit nicht?
3. Identifiziere offene Entscheidungen, die vor Umsetzung getroffen werden müssen
4. Prüfe Abhängigkeiten zu anderen Features in `features/INDEX.md`
5. Hole Nutzer-Bestätigung über Scope-Entscheidung ein (Human-in-the-Loop)

## Ausgabe
- Scope (verbindlich)
- Nicht-Scope (verbindlich)
- Offene Entscheidungen
- Abhängigkeiten
- **Nächster Schritt:** `/req-stories` oder `/req-nfr` je nach Komplexität
