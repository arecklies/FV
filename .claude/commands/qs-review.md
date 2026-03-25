---
name: qs-review
description: Führt Verifikation einer Implementierung durch. Prüft Akzeptanzkriterien, RLS-Verhalten, Auth-Verhalten und Übereinstimmung mit testing.md-Qualitätsgates. Aufruf mit /qs-review [PROJ-X]
---

Lies zuerst:
- Testplan (falls vorhanden, Ausgabe von `/qs-testplan`)
- Feature-Spec und Akzeptanzkriterien: `features/PROJ-X-*.md`
- Implementierungsdateien: `git ls-files src/`
- `.claude/rules/testing.md` – Qualitätsgates

Agiere als **Senior QS Engineer** gemäß `.claude/agents/senior-qs-engineer.md`.

## Aufgabe
Verifiziere eine fertiggestellte Implementierung.

## Schritte
1. Prüfe Übereinstimmung mit Akzeptanzkriterien aus Feature-Spec
2. Prüfe bestehende Tests auf veraltete Stubs: 501-Platzhalter, auskommentierte Tests, Mocks die nicht mehr zum Produktivcode passen
3. Führe Testfälle aus: `npx jest --forceExit --no-coverage` (forceExit wegen Timer-basiertem Code). Bei Coverage-Prüfung: `npx jest --forceExit --coverage`
4. Prüfe RLS-Verhalten: kein Cross-Tenant-Zugriff möglich?
5. Prüfe Auth-Verhalten: unauthentifizierte Requests abgewiesen?
6. Prüfe Qualitätsgates aus `.claude/rules/testing.md`:
   - Testabdeckung ≥ 80 % für neue Dateien?
   - RLS-Tests grün?
7. Prüfe BITV 2.0 (Barrierefreiheit) gemäß `.claude/rules/testing.md`:
   - Neue UI-Komponenten: ARIA-Labels, Rollen, Fokus-Management vorhanden?
   - Keine neuen Interaktionen ohne Tastaturzugänglichkeit?
   - Bei reinen Backend-/Infrastruktur-Änderungen: "Keine UI-Änderung – BITV nicht betroffen" dokumentieren
8. Identifiziere Testlücken
9. Dokumentiere Befunde mit Reproduktionsschritten

## Ausgabe
- Verifikationsergebnis
- Befunde (kritisch / major / minor) mit Reproduktionsschritten
- Testlücken
- **Nächster Schritt:** `/qs-release` bei bestandener Prüfung oder `/backend-api` / `/frontend-component` bei Nacharbeit
