---
name: migration-cutover
description: Bereitet Cutover vor, prüft alle Go/No-Go-Kriterien aus migration.md, erstellt Cutover-Checkliste und holt explizite Go-Entscheidung des Product Owners ein. Aktualisiert features/INDEX.md nach erfolgreichem Cutover. Aufruf mit /migration-cutover [MIGRATION-X]
---

Lies zuerst:
- Phasen-Spec: `features/MIGRATION-X-*.md`
- QS-Bericht (Ausgabe von `/qs-release` für diese Phase)
- `features/INDEX.md`
- `.claude/rules/migration.md` – Go-Kriterien

Agiere als **Migration Architect** gemäß `.claude/agents/migration-architect.md`.

## Aufgabe
Bereite Cutover vor und prüfe alle Go/No-Go-Kriterien.

## Go-Kriterien (alle müssen erfüllt sein – Pflicht aus `.claude/rules/migration.md`)
- [ ] Feature-Parität ≥ 95 % der genutzten Legacy-Funktionen
- [ ] Datenmigration ohne kritische Fehler abgeschlossen
- [ ] QS-Abnahme für alle Kern-Workflows erteilt (QS-Bericht liegt vor)
- [ ] Rollback-Plan getestet und dokumentiert
- [ ] Infrastruktur-Bereitschaft bestätigt (DevOps)
- [ ] Keine offenen kritischen Security-Befunde

## Schritte
1. Prüfe jeden Go-Kriterium einzeln mit Nachweis
2. Erstelle Cutover-Checkliste mit Verantwortlichkeiten:
   - DB-Migration ausführen (Database Architect / DevOps)
   - Backend deployen (DevOps)
   - Feature-Flags aktivieren (Migration Architect)
   - Frontend deployen (DevOps)
   - Monitoring-Bestätigung (DevOps)
3. Definiere No-Go-Trigger (Rollback-Auslöser, z.B. Fehlerrate > X %)
4. **Hole explizite Go-Entscheidung vom Product Owner ein (Human-in-the-Loop – zwingend, kein Cutover ohne diese)**
5. Nach erfolgreichem Cutover: `features/INDEX.md` → Status `Deployed`
6. **Artefakt-Cleanup-Checkliste:**
   - Feature Flags: Alle `FF_*` fuer diese Phase identifizieren und Deaktivierungsdatum pruefen
   - Dual-Write-Logik: Alle Dual-Write-Pfade identifizieren und Entfernungszeitpunkt festlegen
   - Legacy-Code-Pfade: Nicht mehr benoetigte Fallbacks markieren (TODO: Remove after MIGRATION-X)
   - Cleanup-Items als Eintraege in `/po-backlog` vorschlagen

## Ausgabe
- Go/No-Go-Status je Kriterium (mit Nachweis)
- Cutover-Checkliste (mit Verantwortlichkeiten)
- No-Go-Trigger-Definition
- Rollback-Ausführungsplan
- Aktualisierte `features/INDEX.md` (nach erfolgreichem Cutover)
- **Nächster Schritt:** `/devops-deploy` nach Go-Entscheidung
