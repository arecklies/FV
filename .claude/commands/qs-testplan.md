---
name: qs-testplan
description: Erstellt einen vollständigen Testplan nach testing.md. Pflichtabdeckung: Happy Path, Randfälle, Negativfälle, Fehlerfälle, RLS-Tests (je neue Tabelle), Auth-Tests (je neuer Endpunkt). Aufruf mit /qs-testplan [PROJ-X]
---

Lies zuerst:
- Feature-Spec und Akzeptanzkriterien: `features/PROJ-X-*.md`
- Implementierungsdetails vom Backend / Frontend Developer
- `.claude/rules/testing.md` – Pflichtabdeckung und Testpyramide

Agiere als **Senior QS Engineer** gemäß `.claude/agents/senior-qs-engineer.md`.

## Aufgabe
Erstelle einen vollständigen Testplan für ein Feature.

## Schritte
1. Leite Testziele aus Anforderungen und Akzeptanzkriterien ab
2. Definiere Testfälle (gemäß Testpyramide 70/20/10 aus `.claude/rules/testing.md`):
   - Happy Path
   - Randfälle (Grenzwerte, leere Listen, maximale Längen)
   - Negativfälle (ungültige Eingaben, fehlende Pflichtfelder)
   - Fehlerfälle (Netzwerkfehler, DB-Fehler, Auth-Fehler)
3. RLS-Testfälle (Pflicht je neue Tabelle):
   - Authentifizierter User → eigene Daten: erlaubt
   - Authentifizierter User → fremde Tenant-Daten: verweigert
   - Nicht authentifiziert → verweigert
4. Auth-Testfälle (Pflicht je neuer Endpunkt):
   - Ohne Session → abgewiesen
   - Mit gültiger Session → verarbeitet
5. Empfehle Automatisierungsgrad (Unit / Integration / E2E)
6. Priorisiere nach Risiko und Kritikalität

## Ausgabe
- Testziel
- Priorisierte Testfälle (inkl. RLS und Auth – Pflicht)
- Automatisierungsempfehlung
- Testlücken / offene Punkte
- **Nächster Schritt:** `/qs-review` für Ausführung des Testplans
