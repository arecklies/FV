# Backend Rules

> Diese Regeln gelten primär für den **Senior Backend Developer** (`.claude/agents/senior-backend-developer.md`).
> Der **Database Architect** (`.claude/agents/database-architect.md`) beachtet zusätzlich `.claude/rules/database.md`.
> Der **DevOps/Platform Engineer** (`.claude/agents/devops-platform-engineer.md`) beachtet den Abschnitt „Security".
> Der **Senior Security Engineer** (`.claude/agents/senior-security-engineer.md`) prüft alle Abschnitte im Audit-Kontext.

## Database (Supabase)
> Vollständige Regeln: `.claude/rules/database.md` (RLS, Schema-Design, Indizes, Migrationen, Multi-Tenancy)
- RLS, Indizes, Migrationen und Multi-Tenancy → siehe `database.md`
- Der Backend Developer beachtet insbesondere: RLS-Policies, Query Patterns, `.limit()` auf Listen-Queries

## API Routes (Next.js)
- Alle Eingaben mit **Zod-Schemas** validieren, bevor sie verarbeitet werden
- Authentifizierung bei jedem Request prüfen: User-Session muss existieren (bei authentifizierten Routes)
- Bei anonymen Routes (kein Login): alternative Autorisierung dokumentieren (z.B. Payment-Token, IP-Rate-Limit)
- Fehlermeldungen mit korrekten HTTP-Statuscodes und lesbaren Details zurückgeben:
  - 400: Ungültige Eingabe (Zod-Fehler mit Feldname + Meldung)
  - 401: Nicht authentifiziert
  - 403: Nicht autorisiert (z.B. falscher Tenant)
  - 404: Ressource nicht gefunden (auch bei RLS-Blockade, um Tenant-Zugehörigkeit nicht zu leaken)
  - 409: Konflikt (z.B. Duplikat, Optimistic Locking)
  - 500: Interner Fehler (keine internen Details an Client, nur ins Log)
- `.limit()` auf alle Listen-Queries setzen
- POST-Endpunkte müssen idempotent sein (via natürlichem Schlüssel oder Idempotenz-Key)
- PUT/PATCH sind idempotent by Design (gleicher Request = gleiches Ergebnis)
- Security Headers als gemeinsame Konstante in `src/lib/api/security-headers.ts` importieren — nicht pro Route duplizieren
- Vor neuer Logik in API-Routen: bestehende Helfer in `src/lib/api/` und `src/lib/` suchen
- Insbesondere: `writeAuditLog()` für Audit-Log, `validationError()`/`serverError()` für Responses, `requireAuth()`/`requireAdmin()` für Auth
- Keine direkte `.from("audit_log").insert()` — immer `writeAuditLog()` verwenden

## Supabase Server-Client (Next.js App Router)
- `createServerClient()` in `src/lib/supabase-server.ts` liest den Access-Token aus dem Cookie `sb-access-token`
- **Custom Fetch ist Pflicht:** Supabase JS v2 Auth-Module ueberschreibt den Authorization-Header — der custom fetch in `createServerClient()` erzwingt den Cookie-Token
- **Cookie-Synchronisation:** Der AuthProvider (`src/components/auth/auth-provider.tsx`) und die Login-Seite setzen das Cookie `sb-access-token` bei jeder Session-Aenderung
- **Cache-Funktionen (`unstable_cache`):** Haben keinen Zugriff auf Request-Cookies — fuer globale Daten (Referenztabellen) `createServiceRoleClient()` verwenden
- Aenderungen an `supabase-server.ts` oder am Cookie-Mechanismus → manuelle Pruefung auf Staging

## Soft-Delete und RLS-Einschraenkungen
- Soft-Delete (UPDATE auf `deleted_at`) kann durch RLS-Policies blockiert werden:
  - `.select().single()` nach dem UPDATE findet die Zeile nicht mehr (SELECT-Policy filtert `deleted_at IS NOT NULL`)
  - UPDATE WITH CHECK kann in PostgREST-Kontext fehlschlagen (bekanntes Problem)
- Workaround: `createServiceRoleClient()` fuer Soft-Delete verwenden, mit explizitem `tenant_id`-Filter
- Auth MUSS vor dem Service-Role-Aufruf geprueft sein (`requireAuth()`)
- Referenz: `src/app/api/erhebungsboegen/[id]/route.ts` DELETE-Handler

## Query Patterns
> Vollständige Regeln: `.claude/rules/database.md` Abschnitt „Query Patterns"
- Supabase-Joins verwenden statt N+1-Query-Schleifen
- `.limit()` auf alle Listen-Queries setzen
- Fehler aus Supabase-Responses immer behandeln – nie stillschweigend ignorieren
- Keine ungefilterten Queries auf mandantenübergreifende Daten

## Type Safety
- `as unknown as X` Doppel-Casts sind verboten — wenn ein Cast nötig ist, fehlt ein Typ oder die Query ist falsch typisiert
- Supabase-Query-Ergebnisse ueber Zod-Schema parsen statt casten:
  ```typescript
  // FALSCH: Type Assertion (B-003 aus PROJ-3 Retro)
  return { data: data as Vorgang };

  // RICHTIG: Zod-Schema parsen
  return { data: VorgangDbSchema.parse(data) };

  // RICHTIG: Listen parsen
  const parsed = (data ?? []).map((d: unknown) => VorgangListItemDbSchema.parse(d));
  ```
- Alle `[id]`-Path-Parameter in API-Routes mit `UuidParamSchema.safeParse(id)` validieren (B-004)
- `any` ist verboten in Produktivcode (erlaubt in Test-Mocks)
- Bei unvermeidbaren Casts: Kommentar mit Begründung und TODO für Typisierung

## Security
> Vollständige Regeln: `.claude/rules/security.md` (Secrets, Input Validation, Auth, Multi-Tenancy)
- Secrets, Input Validation, Auth und Multi-Tenancy → siehe `security.md`
- Der Backend Developer beachtet insbesondere: Zod-Validierung, Auth-Check vor jeder API-Route, `.env.local.example`
- Änderungen an RLS-Policies oder Auth-Flow erfordern explizite Nutzer-Freigabe (Human-in-the-Loop gemäß `CLAUDE.md`)

## Externe API-Integrationen
- Alle Responses externer APIs mit **Zod-Schemas** validieren, bevor sie verarbeitet werden
- Externe Fehlerdetails (Stack Traces, API-Keys, SDK-Meldungen) NIEMALS an Client weiterleiten - nur ins Server-Log
- Timeout auf jeden externen API-Call setzen (max. 55s fuer Serverless)
- API-Keys fuer externe Dienste: nur ueber Env-Variablen, Existenz-Check VOR dem Streaming/Response-Start
- Bei fehlendem API-Key: sofort HTTP 500 mit generischer Meldung (kein Streaming starten)
- Modellnamen, API-Versionen und Endpunkt-URLs externer Dienste NIEMALS als String-Literal in Geschäftslogik – immer als benannte Konstante in einer zentralen Konfigurationsdatei oder als Umgebungsvariable
- Rate-Limiting eigener Endpunkte: Slot erst nach erfolgreicher Verarbeitung zaehlen (nicht bei Validierungsfehler)

## Dependencies
- Vor `npm install` einer neuen Dependency pruefen: ESM-only? (`"type": "module"` in package.json der Dependency)
- ESM-only Pakete (z.B. jose, nanoid, p-limit) sind mit Jest/ts-jest inkompatibel — Alternativen bevorzugen:
  - JWT: Node.js `crypto` (HMAC-SHA256) statt `jose`
  - UUID: `crypto.randomUUID()` statt `nanoid`
- Bei unvermeidbarer ESM-Dependency: `transformIgnorePatterns` in `jest.config.ts` anpassen

## Service-Isolation (ADR-015)
- Externe Standards (XBau, XTA, FIT-Connect) werden in isolierten Services implementiert, nicht im Fachverfahren
- Fachverfahren kommuniziert ueber JSON via `background_jobs`-Tabelle (ADR-008)
- Vor Implementierung eines Standards: `/arch-design` mit Frage "Direkt oder isolierter Service?"
- Isolierte Services liegen unter `<service-name>/` im Repo-Root (eigenes package.json, Dockerfile)
- Message Builder im Fachverfahren sind Uebergangloesungen — bei Service-Migration entfernen

## XBau-Service Migrationsstatus
- **Zielzustand:** Alle XML-Operationen ausschliesslich im `xbau-service/` Docker-Container
- **Uebergangszustand (aktuell):** Message Builders existieren doppelt:
  - `src/lib/services/xbau/messages/` (TypeScript, synchron im Fachverfahren)
  - `xbau-service/src/messages/` (JS ESM, Docker-Worker)
- **Regel:** Neue Message Builder NUR in `xbau-service/` erstellen. Bestehende im Fachverfahren werden bei Docker-Go-Live entfernt.
- **Bei Aenderung an bestehendem Builder:** Beide Stellen aktualisieren, bis Migration abgeschlossen

## XBau / XML-Generierung
- Vor jeder Änderung an XML-Generatoren: XSD-Quelldateien unter `Input/xsd+xsd_dev/xsd/` lesen
- Element-Namen, Namespace-Qualifizierung (`form="qualified"` vs `form="unqualified"`), Typ-Strukturen und Code-Attribute NIEMALS raten – immer aus der XSD ableiten
- Jeder Code-Typ (z.B. `Code.RaeumeAnzahl`) hat `listURI` und `listVersionID` als `fixed`-Attribute in `xbau-codes.xsd` – diese Werte exakt übernehmen
- Referenz-XML für korrektes Namespace-Pattern: `output/baugenehmigung.antrag.0200_*.xml`
- Nachrichtenspezifische Elemente sind qualified (`xbau:`-Prefix), Kernmodul-Elemente sind unqualified (kein Prefix)

## Code-Mapping-Konsistenz (XBau ↔ Datenbank)
- Es gibt ZWEI Code-Systeme fuer Energietraeger:
  1. `BRENNSTOFF_MAPPING` in `codes.ts` (Keys 0-14) – fuer XBau-XML-Generierung (Erhebungsbogen → XBau)
  2. `code_energietraeger`-Tabelle (Codes 0-23) – fuer Formular-UI und DB-Speicherung
- Bei neuen Mappings (z.B. XML-Import) IMMER gegen die DB-Codes mappen (`code_energietraeger.code`), NICHT gegen `BRENNSTOFF_MAPPING`-Keys
- Referenztabellen-Kategorien (`code_energietraeger.kategorie`) im Frontend-Filter muessen exakt mit den DB-Werten uebereinstimmen — vor Filterung pruefen: `SELECT DISTINCT kategorie FROM code_energietraeger`
- Referenz fuer korrekte Zuordnung: `src/lib/xbau/parse-0420.ts` (`XBAU_BRENNSTOFF_TO_DB`)
