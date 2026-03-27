# ADR-013: Stellvertreter-Modell fuer Vier-Augen-Freigabe

**Status:** Accepted
**Datum:** 2026-03-27
**Autor:** Senior Software Architect
**Feature:** PROJ-35 (Vertretungsregelung Vier-Augen-Freigabe)

## Kontext

Die Vier-Augen-Freigabe (PROJ-33, ADR-011) bindet die Freigabeberechtigung an die Rolle `referatsleiter` (oder hoeher). Bei Abwesenheit des Referatsleiters koennen keine Bescheide freigegeben werden — Pilotblocker Soest. Es wird eine Stellvertreter-Regelung benoetigt, die sich nahtlos in die bestehende Workflow Engine (ADR-011), das RBAC-Modell (ADR-002) und die Service-Kapselung (ADR-003) einfuegt.

Zentrale Designfrage: Wie wird die Freigabeberechtigung eines Stellvertreters modelliert — rollenbasiert (jeder Referatsleiter darf alles) oder freizeichnerbasiert (Freigabe an konkreten Referatsleiter pro Vorgang gebunden)?

## Entscheidung

### 1. Stellvertreter-Tabelle (Service-Only)

Neue Tabelle `freigabe_stellvertreter` mit deny-all RLS (konsistent mit `tenant_members`). Composite FKs auf `(tenant_id, user_id)` verhindern Cross-Tenant-Vertretungen auf DB-Ebene.

Schema:
- `id uuid PK`
- `tenant_id uuid FK tenants(id) ON DELETE CASCADE`
- `vertretener_id uuid` — Composite FK `(tenant_id, vertretener_id)` auf `tenant_members(tenant_id, user_id)`
- `stellvertreter_id uuid` — Composite FK `(tenant_id, stellvertreter_id)` auf `tenant_members(tenant_id, user_id)`
- `created_at timestamptz DEFAULT now()`
- `UNIQUE(tenant_id, vertretener_id, stellvertreter_id)`
- `CHECK(vertretener_id != stellvertreter_id)`

### 2. Modell A (Rollen-basiert) fuer MVP

Im MVP darf jeder Nutzer mit Rolle >= `referatsleiter` jeden Vorgang im Mandanten freigeben (so funktioniert PROJ-33 heute). Stellvertreter erweitern diesen Kreis: Auch Nutzer die als Stellvertreter eingetragen sind, sehen die Freigabe-Eintraege der zugeordneten Referatsleiter.

Kein Feld `freizeichner_id` auf `vorgaenge` im MVP.

### 3. Eigener StellvertreterService (ADR-003)

Neuer Service unter `src/lib/services/stellvertreter/` mit CRUD-Operationen und Rollen-Validierung. Der WorkflowService ruft den StellvertreterService fuer den Stellvertreter-Lookup bei Freigabe-Schritten auf. Klare Trennung: Service kennt kein HTTP, API-Route ermittelt Vertretungs-Kontext.

### 4. Audit-Trail-Erweiterung

`vorgang_workflow_schritte` erhaelt Spalte `vertretung_fuer uuid NULL` (kein FK — Audit-Charakter, muss nach Loeschung der Vertretungsbeziehung gueltig bleiben). Audit-Log-Payload wird um `vertretung_fuer` und `vertretung_fuer_name` erweitert.

### 5. Keine transitive Vertretung

Nur direkte Vertretungsbeziehungen. Wenn A Stellvertreter von B ist und B Stellvertreter von C, darf A NICHT fuer C freigeben.

## Alternativen verworfen

### Alt-1: Modell B — Freizeichner pro Vorgang (explizit)

Neues Feld `vorgaenge.freizeichner_id` haette die Freigabe an einen konkreten Referatsleiter gebunden. Stellvertreter duerfte nur Vorgaenge freigeben, deren Freizeichner er vertritt.

**Verworfen weil:** Das aktuelle System hat kein Freizeichner-Konzept. Einfuehrung wuerde PROJ-3 (Vorgangsverwaltung) aendern und den Scope von PROJ-35 sprengen. Fuer den Pilotstart Soest (ein Referatsleiter) ist Modell A ausreichend. **Modell B wird in PROJ-9 (Phase 2) eingefuehrt**, wenn groessere Behoerden mit mehreren Referaten angebunden werden.

### Alt-2: Vertretung in Workflow-Definition modellieren

`WorkflowSchritt.erlaubteVertretung: boolean` als JSON-Attribut.

**Verworfen weil:** Vertretung ist ein organisatorisches Konzept, kein Workflow-Attribut. Wuerde die JSON-Struktur aufblaehen und erfordert Re-Deployment bei Aenderung.

### Alt-3: RLS-basierter Zugriff statt Service-Only

RLS-Policies fuer differenzierten Zugriff (Referatsleiter sieht eigene Stellvertreter, Admin sieht alle).

**Verworfen weil:** Autorisierungslogik zu komplex fuer RLS (Cross-User-Lookup, Rollen-Check). Konsistenz mit bestehendem Pattern (`tenant_members`, `config_workflows` sind Service-Only).

### Alt-4: `display_name` auf Vertretungstabelle denormalisieren

**Verworfen weil:** Dateninkonsistenz bei Namensaenderung. Admin-Uebersicht hat < 50 Zeilen, JOIN auf `auth.users` ist performant genug.

## Konsequenzen

**Positiv:**
- Nahtlose Integration in bestehende Workflow Engine (ADR-011) — minimale Aenderung an `getVerfuegbareAktionen`
- Service-Kapselung (ADR-003) bleibt gewahrt — eigener `StellvertreterService`
- Vorwaertskompatibel mit PROJ-9 (Phase 2): Vertretungstabelle ist generisch, Modell B kann ohne Schema-Aenderung eingefuehrt werden
- ON DELETE CASCADE bereinigt verwaiste Vertretungen automatisch
- Audit-Trail dokumentiert Vertretungs-Freigaben vollstaendig

**Negativ / Risiken:**
- Modell A ist ungenau bei mehreren Referatsleitern — jeder Referatsleiter darf alles freigeben (fuer Soest akzeptabel, fuer groessere Behoerden nicht)
- Composite FK erfordert UNIQUE-Constraint auf `tenant_members(tenant_id, user_id)` — muss vor Migration verifiziert werden
- `vertretung_fuer` ohne FK kann verwaiste UUIDs enthalten (akzeptabel, da Audit-Charakter)

## Beteiligte Rollen

- **Senior Software Architect:** Architektur-Design und Entscheidung
- **Database Architect:** Schema-Review, FK-Strategie
- **Senior Backend Developer:** WorkflowService-Erweiterung, API-Design
- **Senior Security Engineer:** Service-Only-Pattern, Cross-Tenant-Pruefung
- **Product Owner:** Scope-Entscheidung Modell A vs. B

## Referenzen

- [PROJ-35 Feature-Spec](../../features/PROJ-35-vertretungsregelung-freigabe.md)
- [ADR-002: RBAC](ADR-002-authentifizierung-sso-strategie.md)
- [ADR-003: Service-Kapselung](ADR-003-service-architektur-kapselung.md)
- [ADR-011: Workflow Engine](ADR-011-workflow-engine.md)
- [PROJ-33: Vier-Augen-Lite](../../features/PROJ-33-vier-augen-lite.md)
- [PROJ-9: Vier-Augen-Workflow Phase 2](../../features/) (geplant)
