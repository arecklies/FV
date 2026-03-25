# ADR-007: Multi-Tenancy-Modell

## Status
Accepted

## Kontext

Mandantentrennung ist K.O.-Kriterium Nr. 4. Daten verschiedener Kommunen muessen strikt getrennt sein. Optionen: Database-per-Tenant, Schema-per-Tenant, Row-Level Security (RLS).

## Entscheidung

**Row-Level Security (RLS) mit `tenant_id`, in zwei Phasen.**

### Phase 1: Ohne Mandanten (aktuell)
- Keine mandantenfaehigen Tabellen
- Alle Tabellen Service-Only oder oeffentlich
- Keine `tenant_id`, solange kein Benutzerkonzept existiert
- RLS trotzdem auf jeder Tabelle: deny-all fuer Client-Rollen
- Zugriff nur ueber Service-Role-Key im Backend

### Phase 2: Organisation-Level Tenancy (ab Benutzerkonto-Einfuehrung)
- `tenants` + `tenant_members` Tabellen
- `tenant_id` referenziert Organisation, nicht `auth.uid()`
- RLS via JWT Custom Claim `tenant_id`
- Jede mandantenfaehige Tabelle: `tenant_id uuid REFERENCES tenants(id)`

### RLS-Policy-Muster (Phase 2)
```sql
CREATE POLICY "tenant_select" ON <table>
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_insert" ON <table>
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_update" ON <table>
  FOR UPDATE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_delete" ON <table>
  FOR DELETE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

### Service-Only-Tabellen
- Systemweite Tabellen (Codelisten, Konfiguration) ohne `tenant_id`
- deny-all RLS fuer Client-Rollen
- Zugriff nur ueber Service-Role-Key
- Jede neue Tabelle: explizit als "mandantenfaehig" oder "Service-Only" klassifizieren

### Verworfene Alternativen
- **Database-per-Tenant**: Supabase Cloud unterstuetzt keine dynamische DB-Erstellung
- **Schema-per-Tenant**: Performance-Probleme bei >100 Schemas, Migrations-Komplexitaet

## Begruendung

1. RLS erzwingt Isolation auf DB-Ebene -- auch bei Applikationsfehlern
2. Organisation-Level: `tenant_id` = Organisation, Benutzer kann mehreren Orgs angehoeren
3. JWT Custom Claims: Tenant-Kontext automatisch durch RLS geprueft
4. Phase 1 ohne Mandanten: Vermeidet toten Code und falsche Sicherheit

## Konsequenzen

- (+) Isolation auf DB-Ebene, unabhaengig von Applikationsfehlern
- (+) Einfache Schema-Migrationen (eine Tabelle fuer alle)
- (+) Supabase-nativer Ansatz
- (-) **Service-Role-Key umgeht RLS**: Groesstes Einzelrisiko. Jede Nutzung mit explizitem tenant_id-Filter und Auth-Pruefung.
- (-) Cross-Tenant-Bugs sind subtil: Fehlender WHERE-Filter liefert alle Daten
- (-) JWT-Rotation bei Mandantenwechsel noetig

## Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Cross-Tenant-Datenleck (Service-Role) | Mittel | Kritisch | Pflicht-Tests alle 4 RLS-Ops, Code-Review, sofortige Eskalation |
| Service-Role-Key kompromittiert | Niedrig | Kritisch | Key-Rotation, minimale Berechtigungen, Audit-Log |
| RLS-Performance bei grossen Tabellen | Niedrig | Mittel | Index auf tenant_id, EXPLAIN ANALYZE |

## Referenzen
- K.O.-Kriterium Nr. 4: `Input/AnFo/bauaufsicht_anforderungen.md`
- Database Rules: `.claude/rules/database.md`, Multi-Tenancy
- Security Rules: `.claude/rules/security.md`
- ADR-002: Auth (JWT Custom Claims)
