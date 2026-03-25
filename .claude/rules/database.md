# Database Rules

> Diese Regeln gelten primär für den **Database Architect** (`.claude/agents/database-architect.md`).
> Der **Senior Backend Developer** (`.claude/agents/senior-backend-developer.md`) beachtet „RLS" und „Query Patterns" bei jeder Implementierung.
> Der **Senior Security Engineer** (`.claude/agents/senior-security-engineer.md`) prüft „RLS" und „Multi-Tenancy" im Audit-Kontext.
> Der **Migration Architect** (`.claude/agents/migration-architect.md`) beachtet „Migrationen" und „Multi-Tenancy" bei der Migrationsplanung.
> Der **DevOps/Platform Engineer** (`.claude/agents/devops-platform-engineer.md`) beachtet „Migrationen" bei der Deployment-Reihenfolge.

## Technologie
- **Datenbank**: Supabase (PostgreSQL)
- **Migrations-Tool**: Supabase CLI (`supabase migration new`, `supabase db push`)
- **ORM / Query**: Supabase JS Client (typisiert via `supabase gen types`)

## Row Level Security (RLS)
- RLS auf JEDER Tabelle aktivieren – keine Ausnahmen, auch nicht temporär
- Policies für alle vier Operationen anlegen: SELECT, INSERT, UPDATE, DELETE
- Policies immer mit `USING` und `WITH CHECK` definieren, wo relevant
- Nach jeder Schema-Änderung: RLS-Policies auf Vollständigkeit prüfen
- Änderungen an bestehenden RLS-Policies → Human-in-the-Loop (autoritative Liste: `CLAUDE.md` Abschnitt „Human-in-the-Loop")

## Schema-Design
- Primärschlüssel: `uuid` mit `gen_random_uuid()` als Default
- Timestamps: `created_at` und `updated_at` auf jeder Tabelle (`timestamptz`, `DEFAULT now()`)
- Foreign Keys mit `ON DELETE CASCADE` setzen, wo fachlich sinnvoll
- Spaltenbenennungen: `snake_case`
- Keine Geschäftslogik in Datenbank-Triggern – Logik gehört in die Applikationsschicht
- Erlaubt in Triggern: `updated_at`-Aktualisierung (strukturell, keine Geschäftslogik)
- Audit-Logging gehört in die Applikationsschicht, nicht in Trigger
- Nullable-Felder sparsam einsetzen – explizit begründen

## Indizes
- Index auf alle Spalten, die in `WHERE`, `ORDER BY` oder `JOIN` verwendet werden
- Composite Indexes vor mehreren Einzelindizes bevorzugen, wenn Queries mehrere Spalten filtern
- `EXPLAIN ANALYZE` vor und nach Index-Änderungen ausführen
- Ungenutzte Indizes identifizieren und entfernen (Schreibkosten)

## Migrationen
- Jede Migration muss rückwärtskompatibel sein (Zero-Downtime)
- Migrations-Dateien sind unveränderlich nach dem Commit – niemals nachträglich editieren
- Jede Migration hat eine Roll-Forward- und eine Roll-Back-Variante
- Rollback-Scripts unter `supabase/rollbacks/<version>_<name>_rollback.sql` ablegen
- Rollback-Ausfuehrung: SQL manuell via Supabase Dashboard SQL Editor oder `psql` ausfuehren, danach `supabase migration repair --status reverted <version>`
- **Reihenfolge: DB-Migration immer vor App-Deployment ausführen**
- **Migrations-Verifikation vor Deployment:** Vor jedem `/devops-deploy` prüfen ob alle Migrations-Dateien auf der Ziel-DB ausgeführt wurden
- **Vollstaendiger Migrationsabgleich bei Staging-Tests:**
  - Auf Staging: `SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;`
  - Lokal: `ls supabase/migrations/`
  - Jede lokale Migration die nicht in der DB-Abfrage erscheint MUSS vor dem Test ausgefuehrt werden
  - Bei > 3 fehlenden Migrationen: Alle nacheinander in chronologischer Reihenfolge ausfuehren, Fehler bei "already exists" ueberspringen
  - Bei Fehler "column X already exists": Migration war teilweise angewendet — Rest der Statements einzeln ausfuehren
- Destruktive Operationen (DROP, Spalten entfernen, Typ-Änderung) → Human-in-the-Loop
- Große Datenmengen: `UPDATE`/`DELETE` in Batches ausführen (Lock-Vermeidung)
- Neue Migrations-Datei anlegen: `supabase migration new <beschreibender-name>`

## Query Patterns
- Supabase-Joins verwenden statt N+1-Query-Schleifen
- `.limit()` auf alle Listen-Queries setzen
- `unstable_cache` aus Next.js für Referenzdaten einsetzen (Codewerte, Signierschlüssel – TTL: 24h)
- Tenant-spezifische Daten NICHT global cachen – Cache-Key muss `tenant_id` enthalten
- Fehler aus Supabase-Responses immer behandeln – nie stillschweigend ignorieren
- Keine ungefilterten Queries auf mandantenübergreifende Daten

## Multi-Tenancy
> Architekturentscheidung: `docs/adr/ADR-007-multi-tenancy-modell.md` (Accepted)

- **Phase 1 (aktuell):** Keine mandantenfaehigen Tabellen. Alle Tabellen sind Service-Only oder oeffentlich. Keine Tabelle darf `tenant_id` erhalten, solange kein Benutzerkonzept existiert.
- **Phase 2 (ab Benutzerkonto-Einfuehrung):** Organisation-Level Tenancy mit `tenants` + `tenant_members` Tabellen. `tenant_id` referenziert eine Organisation, nicht `auth.uid()`. RLS via JWT Custom Claim `tenant_id`.
- Isolationsmodell: **Row-Level Security** (Standard) — Schema-per-Tenant und Database-per-Tenant nur bei expliziter Begruendung
- Cross-Tenant-Zugriff in Queries ist ein kritischer Befund → sofortige Eskalation an Security Engineer
- Tenant-Datenmodell-Entscheidungen an Migration Architect und Security Engineer übergeben

### Service-Only-Tabellen (ohne tenant_id)
- Nicht alle Tabellen sind mandantenfaehig — systemweite Tabellen (Code-Wertlisten, Payment, Konfiguration) haben kein `tenant_id`
- Service-Only-Tabellen verwenden deny-all RLS-Policies (`USING(false)` / `WITH CHECK(false)`) fuer alle Client-Rollen
- Zugriff erfolgt ausschliesslich ueber den Service-Role-Key im Backend
- Jede neue Tabelle muss explizit als "mandantenfaehig" oder "Service-Only" klassifiziert werden

## Backup & Archivierung
- Retention-Anforderungen aus den Anforderungen des Requirements Engineers entnehmen
- Soft-Delete (`deleted_at timestamptz`) bevorzugen vor hartem DELETE, wo Audit-Pflichten bestehen
- Archivierungsstrategie für historische Daten dokumentieren
