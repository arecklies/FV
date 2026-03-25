---
name: migration-plan
description: Erstellt oder aktualisiert Migrationsplan für eine SaaS-Transitionsphase. Legt Phasenziele, Eingangs-/Ausgangs-Kriterien, Feature Flags und Rollback-Plan fest. Schreibt MIGRATION-ID in features/INDEX.md. Aufruf mit /migration-plan
---

Lies zuerst:
- `features/INDEX.md` – aktueller Migrationsstand, nächste freie MIGRATION-ID
- Bestehende Phasen-Specs: `features/MIGRATION-*.md`
- `.claude/rules/migration.md`

Agiere als **Migration Architect** gemäß `.claude/agents/migration-architect.md`.

## Aufgabe
Erstelle oder aktualisiere den Migrationsplan für eine Phase.

## Schritte
1. Lies `features/INDEX.md` – prüfe bestehende Migrations-Phasen
2. Vergib nächste freie MIGRATION-ID
3. Erstelle Phasen-Spec unter `features/MIGRATION-X-phase-name.md` mit:
   - Ziel und Scope
   - Eingangs-Kriterien (messbar – was muss vorher erfüllt sein?)
   - Ausgangs-Kriterien (messbar – wann ist die Phase abgeschlossen?)
   - Rollback-Kriterien (wann wird zurückgekehrt?)
   - Rollback-Plan (wie wird zurückgekehrt?)
   - Koexistenzmodell (was läuft wo, Datenkonsistenz-Strategie)
   - Tenant-Onboarding-Reihenfolge (Pilot → Early Adopter → Masse)
   - Feature Flags: `FF_<FEATURE_NAME>_<TENANT_ID>` mit Deaktivierungsdatum
   - Beteiligte Rollen und Übergabe-Outputs
4. Schreibe MIGRATION-ID in `features/INDEX.md` → Status `Planned`
5. Hole Nutzer-Bestätigung über Phasenplan ein (Human-in-the-Loop)

## INDEX.md-Eintrag-Format
```markdown
| MIGRATION-X | [Phasentitel] | Planned | YYYY-MM-DD | [Kurzbeschreibung] |
```

## Ausgabe
- Phasen-Spec (Dateipfad: `features/MIGRATION-X-phase-name.md`)
- Aktualisierte `features/INDEX.md`
- Feature-Flag-Liste mit Deaktivierungsdaten
- **Nächster Schritt:** `/db-schema` für Datenmigrations-Schema oder `/backend-api` für Dual-Write-Logik
