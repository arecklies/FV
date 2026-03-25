---
name: backend-logic
description: Implementiert oder refaktoriert Business-Logik, Domänenobjekte und Service-Schichten. Fokus auf saubere Trennung von Transport-, Domänen- und Infrastruktur-Logik. Commit-Format: type(PROJ-X): description. Aufruf mit /backend-logic [PROJ-X]
---

## Voraussetzung (STOPP bei Verletzung)
1. Prüfe `features/INDEX.md`: Existiert ein Eintrag für die angeforderte PROJ-ID?
2. Prüfe `features/PROJ-X-*.md`: Existiert eine Feature-Spec mit mindestens 1 User Story?
Wenn beides nicht erfüllt: **STOPP. Keinen Code schreiben.** Nutzer informieren:
"Feature hat keine Spec / keinen INDEX-Eintrag. Nächster Schritt: `/po-backlog`."

Lies zuerst:
- Betroffene Dateien: `git ls-files src/`
- Bestehende Muster im Repository: `git ls-files src/lib/` und `git ls-files src/services/`
- Feature-Spec: `features/PROJ-X-*.md`
- `.claude/rules/backend.md`
- `.claude/rules/security.md` – Auth-Kontext und Tenant-Isolation in Domänenlogik

Agiere als **Senior Backend Developer** gemäß `.claude/agents/senior-backend-developer.md`.

## Aufgabe
Implementiere oder refaktoriere Business-Logik für ein Feature.

## Schritte
0. Prüfe ob ein relevanter ADR existiert (`docs/adr/`): Falls die Änderung eine Architekturentscheidung betrifft, muss der ADR aktuell sein. Falls nicht → erst `/arch-adr` aufrufen.
1. Analysiere bestehende Domänenlogik und Konventionen im Repository
2. Entwirf oder überarbeite Domänenobjekte und Service-Schichten
3. Trenne Transport-, Domänen- und Infrastruktur-Logik konsequent
4. Implementiere Validierungsregeln (Zod)
5. Stelle Testbarkeit und Idempotenz sicher
6. Halte Diffs klein und begründet
7. Testcode anpassen gemäß `.claude/rules/testing.md`
8. Zeichensatz-Prüfung (bei deutschen Texten in geänderten Dateien):
   - `grep -rn` auf ASCII-Ersetzungen (ae/oe/ue statt ä/ö/ü) prüfen
   - UTF-8-Umlaute (ä, ö, ü, ß) verwenden, KEINE ASCII-Ersetzungen
   - Referenz: `.claude/rules/frontend.md` Abschnitt "Zeichensatz in Quellcode"
9. Commit-Format: `refactor(PROJ-X): <beschreibung>` oder `feat(PROJ-X): <beschreibung>`

## Ausgabe
- Implementierung (Code)
- Erklärung der Strukturentscheidungen
- Testhinweise
- **Nächster Schritt:** `/qs-review` für Verifikation
