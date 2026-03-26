# PROJ-2: Mandanten-Schema und RLS-Grundstruktur

**Status:** Planned | **Phase:** 0 (Fundament) | **Erstellt:** 2026-03-25
**Letzte Verfeinerung:** 2026-03-26 (req-refine: offene Fragen 1+3 geklaert, fehlende ACs ergaenzt)

---

## 1. Ziel / Problem

Mandantentrennung ist K.O.-Kriterium Nr. 4. Ohne RLS-Grundstruktur koennen keine mandantenfaehigen Tabellen angelegt werden. Diese Spec implementiert ADR-007 Phase 2 (Organisation-Level Tenancy mit `tenants` + `tenant_members`).

## 2. Fachlicher Kontext & Stakeholder

- **Alle Personas:** Daten verschiedener Kommunen strikt getrennt
- **Security Engineer:** Cross-Tenant-Zugriff = kritischer Befund, sofortige Eskalation
- **ADR-007:** RLS mit `tenant_id`, JWT Custom Claims

## 3. Funktionale Anforderungen

- FA-1: Tabelle `tenants` (id, name, slug, settings jsonb, bundesland, created_at, updated_at)
- FA-2: Tabelle `tenant_members` (tenant_id, user_id, role, created_at)
- FA-3: RLS-Policies auf beiden Tabellen (deny-all fuer Client, Service-Only)
- FA-4: JWT Custom Claim `tenant_id` bei Login setzen
- FA-5: RLS-Policy-Template fuer alle zukuenftigen mandantenfaehigen Tabellen
- FA-6: Service-Schicht: Alle Queries durch Tenant-Context, nie direkte Supabase-Queries in Komponenten
- FA-7: Tenant-Provisionierung (Script zum Anlegen neuer Tenants mit Default-Konfiguration)

## 4. User Stories & Akzeptanzkriterien

### US-1: Tenant-Isolation
Als Sachbearbeiter der Kommune A darf ich keine Daten der Kommune B sehen.
- AC-1: SELECT auf mandantenfaehige Tabelle liefert nur eigene Tenant-Daten
- AC-2: INSERT mit fremder tenant_id wird von RLS blockiert
- AC-3: UPDATE/DELETE auf fremde Tenant-Daten wird von RLS blockiert
- AC-4: Automatisierte Tests fuer alle 4 RLS-Operationen

### US-2: Tenant-Konfiguration
Als Tenant-Admin moechte ich Tenant-Einstellungen (Bundesland, Name) konfigurieren.
- AC-1: `settings` JSONB-Spalte fuer mandantenspezifische Konfiguration
- AC-2: Bundesland-Zuordnung bestimmt Regelwerk-Konfiguration
- AC-3: Bundesland-Wert muss ein gueltiges BL-Kuerzel sein (Validierung gegen erlaubte Werte)

### US-3: Benutzer ohne Tenant-Zuordnung
Als System moechte ich bei Login eines Benutzers ohne Tenant-Zuordnung eine klare Fehlermeldung anzeigen.
- AC-1: Login schlaegt fehl mit Meldung "Kein Mandant zugeordnet. Bitte wenden Sie sich an Ihren Administrator."
- AC-2: Kein Zugriff auf geschuetzte Seiten moeglich
- AC-3: Fehlgeschlagener Login wird im Audit-Log protokolliert

## 5. Nicht-funktionale Anforderungen

- NFR-1: RLS auf JEDER Tabelle - keine Ausnahmen
- NFR-2: Index auf `tenant_id` auf jeder mandantenfaehigen Tabelle
- NFR-3: Cross-Tenant-Zugriff = sofortige Eskalation (Qualitaetsgate)
- NFR-4: Service-Role-Nutzung minimiert und dokumentiert

## 6. Spezialisten-Trigger

- **Database Architect:** Schema-Design, RLS-Policies, Indizes
- **Security Engineer:** Cross-Tenant-Pruefung, Service-Role-Risikobewertung
- **QS Engineer:** RLS-Integrationstests fuer alle Operationen

## 7. Offene Fragen

1. ~~Soll `tenant_members` mehrere Rollen pro User/Tenant erlauben?~~ **Geklaert:** Nein. ADR-002: Enum auf `tenant_members.role`, 1 Rolle pro User/Tenant. Erweiterung auf Array spaeter moeglich.
2. Wie wird der Tenant-Kontext bei SSO automatisch gesetzt (Claim Mapping)?
3. ~~Brauchen wir eine `tenant_settings`-Tabelle oder reicht JSONB auf `tenants`?~~ **Geklaert:** JSONB auf `tenants.settings` reicht fuer MVP. Separate Tabelle evaluieren wenn Settings-Struktur zu komplex wird.

## 8. Annahmen

- Phase 1 gemaess ADR-007: Service-Only-Tabellen existieren bereits (Migration vorhanden)
- Ein Benutzer gehoert initial zu genau einem Tenant
- Tenant-Provisionierung erfolgt manuell (Script), kein Self-Service
- `tenant_members.role` ist ein Enum mit genau 5 Werten (ADR-002)

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-1 (Auth) | Parallel, JWT Custom Claims |
| ADR-007 (Multi-Tenancy) | Architekturentscheidung |
| ADR-002 (RBAC, Rollenmodell) | Architekturentscheidung |
| Supabase-Projekt eingerichtet | Voraussetzung |

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Service-Role umgeht RLS | Strukturell | Kritisch | Minimierung, Code-Review, Audit-Log |
| RLS-Policy fehlt auf neuer Tabelle | Mittel | Kritisch | CI-Check: jede Tabelle hat RLS |
| Performance bei vielen Tenants | Niedrig | Mittel | Index auf tenant_id, EXPLAIN ANALYZE |
