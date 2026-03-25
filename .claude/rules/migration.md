# Migration Rules

> Diese Regeln gelten primär für den **Migration Architect** (`.claude/agents/migration-architect.md`).
> Der **Senior Backend Developer** (`.claude/agents/senior-backend-developer.md`) beachtet „Dual-Write" und „Feature Flags" bei der Implementierung.
> Der **Database Architect** (`.claude/agents/database-architect.md`) beachtet „Datenmigration" bei Schema- und Modellentscheidungen.
> Der **DevOps/Platform Engineer** (`.claude/agents/devops-platform-engineer.md`) beachtet „Deployment-Reihenfolge" und „Rollback" bei der Auslieferung.
> Der **Senior Security Engineer** (`.claude/agents/senior-security-engineer.md`) beachtet „Datenmigration" und „Tenant-Isolation" im Audit-Kontext.
> Der **QS Engineer** (`.claude/agents/senior-qs-engineer.md`) beachtet „Qualitätsgates" bei der Verifikation migrierter Daten und Features.

## Migrationsstrategie
- Standardmuster: **Strangler Fig** – Legacy-Funktionen schrittweise durch SaaS-Äquivalente ersetzen
- Kein Big-Bang-Cutover ohne explizite Entscheidung durch Product Owner und Senior PM
- Jede Phase hat messbare Eingangs- und Ausgangskriterien – keine vagen Meilensteine
- Parallelbetrieb von Legacy und SaaS ist der Normalzustand während der Transition
- Jede Phase muss umkehrbar sein, bis zur finalen Dekommissionierung

## Phasenplanung
- Phasen dokumentieren in `features/MIGRATION-X-phase-name.md` (analog zu Feature-Specs)
- Jede Phase enthält:
  - Ziel und Scope
  - Eingangs-Kriterien (was muss vorher erfüllt sein?)
  - Ausgangs-Kriterien (wann ist die Phase abgeschlossen?)
  - Rollback-Kriterium (wann wird zurückgekehrt?)
  - Beteiligte Rollen und deren Übergabe-Outputs
- Phasenstatus in `features/INDEX.md` führen (analog zu Features)

## Feature Flags
- Neue SaaS-Funktionalität hinter Feature Flags aktivieren
- Flag-Konvention: `FF_<FEATURE_NAME>_<TENANT_ID>` oder global `FF_<FEATURE_NAME>`
- Feature Flags sind temporär – Deaktivierungsdatum bei Einführung festlegen
- Legacy-Pfade erst abschalten, wenn Feature Flag für alle Tenants aktiv und stabil
- Änderungen an Feature Flags → Human-in-the-Loop (Nutzer-Freigabe)

## Dual-Write
- Dual-Write einsetzen, wenn Daten gleichzeitig in Legacy und SaaS konsistent sein müssen
- Schreibreihenfolge: Legacy zuerst, SaaS-System danach (Legacy bleibt führendes System bis Cutover)
- Konsistenzprüfung nach jedem Dual-Write-Zyklus durch QS Engineer
- Dual-Write-Logik im Backend Developer verankern – nicht im Datenbankmodell

## Datenmigration
- Einmalige Migration nur für stabile, abgeschlossene Datenbestände
- Inkrementelle Migration (CDC – Change Data Capture) für aktiv genutzte Legacy-Daten
- Transformationsregeln schriftlich dokumentieren (Quellfeld → Zielfeld, Mapping, Default-Werte)
- Tenant-Mapping explizit definieren: welche Legacy-Entität wird zu welchem SaaS-Tenant?
- Datenqualität vor Datenmenge: lieber weniger Tenants sauber migriert als viele mit Fehlern
- Migrationslauf immer zuerst in Nicht-Produktionsumgebung durchführen und durch QS Engineer abnehmen
- Personenbezogene Daten (PII) bei Migration explizit kennzeichnen → Security Engineer einbeziehen

## Cutover-Kriterien
- Cutover nur mit expliziter Go-Entscheidung durch Product Owner
- Go-Kriterien müssen messbar sein:
  - Feature-Parität ≥ 95 % der genutzten Legacy-Funktionen
  - Datenmigration ohne kritische Fehler abgeschlossen
  - QS-Abnahme für alle Kern-Workflows erteilt
  - Rollback-Plan getestet und dokumentiert
- No-Go-Kriterien sofort an Product Owner eskalieren – kein selbstständiges Fortfahren

## Rollback
- Rollback-Plan ist Pflicht vor jedem Cutover – kein Cutover ohne dokumentierten Rückfallweg
- Rollback-Trigger definieren (z.B. Fehlerrate > X %, Datenverlust festgestellt)
- Rollback-Ausführung liegt beim DevOps/Platform Engineer
- Nach Rollback: Ursachenanalyse dokumentieren, bevor nächster Versuch gestartet wird

## Deployment-Reihenfolge
- **DB-Migration → Backend-Deployment → Frontend-Deployment** (zwingend)
- Feature Flags deaktiviert deployen, dann schrittweise aktivieren
- Nie App-Deployment vor abgeschlossener DB-Migration

## Dekommissionierung
- Legacy-System erst abschalten, wenn:
  - Alle Tenants auf SaaS migriert und abgenommen
  - Kein aktiver Traffic mehr auf Legacy-Endpunkten (Monitoring-Bestätigung)
  - Datensicherung der Legacy-Daten abgeschlossen
  - Technische Dokumentation archiviert (Technical Writer)
- Dekommissionierungs-Checkliste durch Product Owner freigeben lassen
