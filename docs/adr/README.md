# Architecture Decision Records (ADR)

> Zentrale Uebersicht aller Architekturentscheidungen im Bauaufsichts-SaaS-Projekt.

## Status-Legende

| Status | Bedeutung |
|--------|-----------|
| **Proposed** | Entwurf, noch nicht final entschieden |
| **Accepted** | Entscheidung getroffen, verbindlich |
| **Deprecated** | Ueberholt durch neuere Entscheidung |
| **Superseded** | Ersetzt durch anderen ADR |

## ADR-Index

| ADR | Titel | Status | Datum |
|-----|-------|--------|-------|
| [ADR-001](ADR-001-hosting-strategie-eu-datenresidenz.md) | Hosting-Strategie und EU-Datenresidenz | **Accepted** | 2026-03-25 |
| [ADR-002](ADR-002-authentifizierung-sso-strategie.md) | Authentifizierung, SSO-Strategie und RBAC | **Accepted** | 2026-03-25 |
| [ADR-003](ADR-003-service-architektur-kapselung.md) | Service-Architektur und Kapselung | **Accepted** | 2026-03-25 |
| [ADR-004](ADR-004-xbau-integrationsstrategie.md) | XBau-Integrationsstrategie | **Accepted** | 2026-03-25 |
| [ADR-005](ADR-005-audit-trail-revisionssicherheit.md) | Audit-Trail und Revisionssicherheit | **Accepted** | 2026-03-25 |
| [ADR-006](ADR-006-rechtskonfiguration-als-daten.md) | Rechtskonfiguration als Daten | **Accepted** | 2026-03-25 |
| [ADR-007](ADR-007-multi-tenancy-modell.md) | Multi-Tenancy-Modell | **Accepted** | 2026-03-25 |
| [ADR-008](ADR-008-asynchrone-verarbeitung-background-jobs.md) | Asynchrone Verarbeitung und Background Jobs | **Accepted** | 2026-03-25 |

> Alle 8 ADRs sind accepted (Review 2026-03-26). Keine offenen Architekturentscheidungen fuer Phase 0/1.

## Konventionen

- Dateiformat: `ADR-XXX-titel-in-kebab-case.md`
- Jeder ADR wird ueber `/arch-adr` erstellt und ueber `/docs-adr` in diesen Index eingepflegt
- ADR-Nummern sind sequenziell und werden nie wiederverwendet
- Naechste verfuegbare Nummer: **ADR-009**
