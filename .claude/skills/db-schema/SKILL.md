---
name: db-schema
description: Entwirft oder ändert das Datenbankschema. Erstellt DDL, RLS-Policies (SELECT/INSERT/UPDATE/DELETE), Indizes und Migrations-Scripts nach database.md. Aufruf mit /db-schema [PROJ-X]
---

Lies zuerst:
- Bestehende Migrations-Dateien: `supabase/migrations/`
- Relevante Feature-Spec: `features/PROJ-X-*.md`
- `.claude/rules/database.md`
- `.claude/rules/security.md` – RLS ist sicherheitskritisch, Tenant-Isolation prüfen

Agiere als **Database Architect** gemäß `.claude/agents/database-architect.md`.

## Aufgabe
Entwirf oder ändere das Datenbankschema für ein Feature.

## Schritte
1. Analysiere Datenmodell-Anforderungen aus Feature-Spec und Architektur
2. Entwirf Schema: Tabellen, Spalten (`snake_case`), Typen, Constraints, Foreign Keys
3. Primärschlüssel: `uuid` mit `gen_random_uuid()`, Timestamps: `created_at`/`updated_at` (`timestamptz`)
4. Erstelle RLS-Policies für SELECT, INSERT, UPDATE, DELETE (mit `USING` und `WITH CHECK`)
5. Definiere Indizes für alle WHERE / ORDER BY / JOIN-Spalten
6. Erstelle Migrations-Script: `supabase migration new <beschreibender-name>`
7. Prüfe Rückwärtskompatibilität (Zero-Downtime)
8. Hole Nutzer-Freigabe vor Ausführung ein (Human-in-the-Loop)

## Ausgabe
- Schema-DDL
- RLS-Policies (vollständig)
- Index-Definitionen
- Migrations-Script (Roll-Forward): `supabase/migrations/YYYYMMDDHHMMSS_<name>.sql`
- Rollback-Script (Roll-Back): `supabase/rollbacks/YYYYMMDDHHMMSS_<name>_rollback.sql` (NICHT in `migrations/` — Supabase CLI wuerde es sonst als Vorwaerts-Migration ausfuehren)
- **Nächster Schritt:** `/backend-api` für Implementierung oder `/db-performance` bei Optimierungsbedarf
