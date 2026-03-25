---
name: db-migration
description: Plant und erstellt Zero-Downtime-Datenbankmigrationen. Berücksichtigt Locking-Verhalten, Rückwärtskompatibilität und Rollback-Pfade. DB-Migration muss VOR App-Deployment ausgeführt werden. Aufruf mit /db-migration [PROJ-X]
---

Lies zuerst:
- Alle bestehenden Migrations-Dateien: `supabase/migrations/`
- `.claude/rules/database.md` – Migrations-Regeln
- `.claude/rules/migration.md` – Deployment-Reihenfolge
- `.claude/rules/backend.md` – Auswirkungen auf API-Kompatibilität
- `.claude/rules/security.md` – RLS-Vollständigkeit nach Schema-Änderung

Agiere als **Database Architect** gemäß `.claude/agents/database-architect.md`.

## Aufgabe
Plane und erstelle eine sichere Datenbankmigration.

## Schritte
1. Analysiere die geplante Schema-Änderung auf Risiken
2. Prüfe Locking-Verhalten bei großen Tabellen (Batches bei UPDATE/DELETE)
3. Entscheide Migrationsstrategie (expand/contract, shadow column, etc.)
4. Erstelle Roll-Forward-Script
5. Erstelle Roll-Back-Script
6. Dokumentiere Ausführungsreihenfolge:
   **DB-Migration MUSS VOR App-Deployment ausgeführt werden** (Pflicht aus `.claude/rules/migration.md` und `.claude/rules/general.md`)
7. Übergib Migrations-Ausführungsplan an DevOps/Platform Engineer für `/devops-deploy`
8. Hole Nutzer-Freigabe bei destruktiven Operationen ein (Human-in-the-Loop)

## Ausgabe
- Migrationsstrategie mit Begründung
- Roll-Forward-Script: `supabase/migrations/YYYYMMDDHHMMSS_<n>.sql`
- Roll-Back-Script
- Ausführungsreihenfolge (explizit: DB vor App)
- Locking-Risiken
- **Nächster Schritt:** `/devops-deploy` für Ausführung im Deployment-Prozess
