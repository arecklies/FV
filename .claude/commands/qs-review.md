---
name: qs-review
description: Führt Verifikation einer Implementierung durch. Prüft Akzeptanzkriterien, RLS-Verhalten, Auth-Verhalten und Übereinstimmung mit testing.md-Qualitätsgates. Aufruf mit /qs-review [PROJ-X]
---

Lies zuerst:
- Testplan (falls vorhanden, Ausgabe von `/qs-testplan`)
- Feature-Spec und Akzeptanzkriterien: `features/PROJ-X-*.md`
- Implementierungsdateien: `git ls-files src/`
- `.claude/rules/testing.md` – Qualitätsgates

## Voraussetzung (STOPP bei Verletzung)
1. Pruefe `features/INDEX.md`: PROJ-ID existiert und Status ist `In Progress`?
2. Pruefe `features/PROJ-X-*.md`: Spec enthaelt mindestens 1 User Story mit ACs?
Bei Verletzung: **STOPP.** Nutzer informieren. Bei falschem Status: "Feature ist im Status [X], erwartet: In Progress."

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

## Ausgabe (Pflicht-Template — MUSS in dieser Struktur geliefert werden)

```markdown
## QS-Review: [Feature-Name] (PROJ-X)
**Verifikationsstatus:** BESTANDEN / NICHT BESTANDEN (X Befunde)

### AC-Prueftabelle
| AC | Pruefung | Stelle (Datei:Zeile) | Status |
|---|---|---|---|
| US-1 AC-1 | [Was geprueft wurde] | [datei.ts:42] | ✅ / ❌ |

### Qualitaetsgates
| Gate | Ergebnis | Anmerkung |
|---|---|---|
| Regressionstests (X/Y) | ✅ / ❌ | |
| Testabdeckung neue Dateien | X% / n.a. | |
| RLS-Tests | ✅ / n.a. | |
| Auth-Tests | ✅ / n.a. | |
| Build | ✅ / ❌ | |
| BITV 2.0 | ✅ / n.a. | |
| Zeichensatz UTF-8 | ✅ | |

### Befunde (sortiert: Kritisch → Major → Minor)
| ID | Schwere | Beschreibung | Reproduktion | Status |
|---|---|---|---|---|
| B-XX-01 | Kritisch/Major/Minor | ... | ... | Offen/Behoben |

### Testluecken
[Liste oder "Keine"]

### Naechster Schritt
`/qs-release PROJ-X` bei BESTANDEN, sonst `/backend-api` oder `/frontend-component` fuer Nacharbeit.
```

**Hinweis:** Dieser Skill aendert NICHT den Status in INDEX.md. Die Status-Aktualisierung auf "In Review" erfolgt ausschliesslich durch `/qs-release`.
