---
name: pm-roadmap
description: Erstellt oder aktualisiert die strategische Produkt-Roadmap auf Quartalsbasis. Analysiert Markttrends, bewertet strategischen Fit und leitet Prioritäten ab. Aufruf mit /pm-roadmap
---

Lies zuerst:
- `features/INDEX.md` – aktueller Produktstand
- `docs/PRD.md` – Produktvision und bestehende Roadmap
- `.claude/rules/general.md` – Projektstruktur

Agiere als **Senior Produktmanager** gemäß `.claude/agents/senior-produktmanager.md`.

## Aufgabe
Erstelle oder aktualisiere die strategische Roadmap für die nächsten 1–2 Quartale.

## Schritte
1. Analysiere aktuelle Features und offene Vorhaben aus `features/INDEX.md`
2. Bewerte jeden Punkt nach Business Value und strategischem Fit
3. Identifiziere Markt- und Wettbewerbsrelevanz
4. Erstelle priorisierte Roadmap auf Quartalsebene
5. Benenne Business-Risiken und strategische Abhängigkeiten
6. Identifiziere strategische Entscheidungspunkte und präsentiere je Punkt 2-3 Optionen:
   - Go-to-Market-Reihenfolge (welche Zielgruppe zuerst?)
   - MVP-Scope (Minimalumfang vs. breite Abdeckung)
   - Migrationsstrategie und Timing (falls Legacy vorhanden)
   - Weitere projektspezifische Weichenstellungen
7. Hole Nutzer-Bestätigung über Entscheidungen ein (Human-in-the-Loop)

## Ausgabe
- Strategische Hypothese
- Roadmap Q1 / Q2 (Quartalsebene)
- Wettbewerbseinschätzung
- Business-Risiken
- **PRD aktualisieren:** Bestätigte Roadmap-Entscheidungen in `docs/PRD.md` persistieren
- **Nächster Schritt:** `/po-backlog` um Roadmap in priorisierte Backlog-Items zu übersetzen
