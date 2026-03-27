---
name: po-review
description: Führt fachliche Abnahme eines fertiggestellten Features durch. Liest QS-Bericht (Ausgabe von /qs-release) und Security-Befunde. Entscheidet über Go / No-Go. Aktualisiert features/INDEX.md. Aufruf mit /po-review [PROJ-X]
---

Lies zuerst:
- QS-Bericht (Ausgabe von `/qs-release` für dieses Feature)
- Security-Befunde (falls `/sec-review` oder `/sec-audit` ausgeführt wurde)
- Feature-Spec: `features/PROJ-X-*.md`
- `features/INDEX.md`

## Voraussetzung (STOPP bei Verletzung)
1. Pruefe `features/INDEX.md`: PROJ-ID existiert und Status ist `In Review`?
2. QS-Bericht (Ausgabe von `/qs-release`) liegt vor?
Bei Verletzung: **STOPP.** Nutzer informieren:
- Status nicht In Review → "Feature ist im Status [X], erwartet: In Review. Zuerst `/qs-release` ausfuehren."
- Kein QS-Bericht → "Kein QS-Bericht vorhanden. Zuerst `/qs-release` ausfuehren."

Agiere als **Product Owner** gemäß `.claude/agents/product-owner.md`.

## Aufgabe
Führe die fachliche Abnahme durch und triff Go / No-Go-Entscheidung.

## Schritte
1. Prüfe QS-Bericht auf Pflicht-Gates:
   - Testabdeckung ≥ 80 %?
   - RLS-Tests grün?
   - Auth-Tests grün?
   - Kritische Befunde offen?
2. Prüfe Security-Befunde:
   - Kritischer Befund oder Cross-Tenant → zwingend No-Go
3. Vergleiche Lieferumfang mit definiertem Scope
4. Prüfe ob alle Must-have-Kriterien aus Feature-Spec erfüllt sind
5. Entscheide: Go / No-Go / Conditional Go
6. Bei Scope-Änderung durch Product Owner:
   - Änderung in Feature-Spec dokumentieren (Abschnitt "Scope" aktualisieren)
   - Nacharbeit durchführen und erneut `/qs-review` auslösen
   - Erst nach erfolgreicher Nacharbeit erneut `/po-review`
7. Hole Nutzer-Bestätigung (Human-in-the-Loop – zwingend)
8. Bei Go: `features/INDEX.md` → Status `Deployed`

## Abnahme-Entscheidungs-Regeln (nicht verhandelbar)
- Kritischer QS-Befund offen → **No-Go**
- RLS-Tests fehlgeschlagen → **No-Go**
- Kritischer Security-Befund / Cross-Tenant → **No-Go**
- Nur Minor-Befunde offen → Conditional Go möglich

## Ausgabe
- Abnahme-Entscheidung (Go / No-Go / Conditional) mit Begründung
- Offene Punkte für Nacharbeit (bei No-Go)
- Akzeptierte Restrisiken (bei Conditional Go)
- Aktualisierte `features/INDEX.md`
- **Nächster Schritt:** `/devops-deploy` bei Go oder `/qs-review` bei No-Go
