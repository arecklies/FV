# MIGRATION-2: Pilotmigration mit Stichtagsmodell

**Status:** Planned
**Erstellt:** 2026-03-25
**Migrationsmuster:** Strangler Fig (Pilot-Phase)

---

## Ziel / Problem

Eine Kommune wird als Pilotkunde migriert. Ab einem Stichtag werden neue Vorgaenge nur im SaaS-System angelegt. Parallelbetrieb 4-6 Wochen mit lesendem Legacy-Zugriff.

## Fachlicher Kontext & Stakeholder

| Stakeholder | Interesse |
|---|---|
| Sachbearbeiter (P1) | Laufende Vorgaenge korrekt migriert |
| Referatsleiter (P3) | Parallelbetrieb, Rollback-Option, Abnahme |
| Amtsleiter (P4) | Kein Rueckstandsaufbau, Budget |

## Funktionale Anforderungen

- FA-1: Testmigration auf Staging (Vollstaendigkeit >= 99,5%)
- FA-2: Datenbereinigung nach MIGRATION-1-Regeln
- FA-3: Stichtags-Definition und Kommunikation
- FA-4: Feature Flag `FF_LEGACY_READ_ONLY_<TENANT_ID>`
- FA-5: Feature Flag `FF_SAAS_PRIMARY_<TENANT_ID>`
- FA-6: Parallelbetrieb 4-6 Wochen mit woechentlichem Statusbericht
- FA-7: Go-Live mit 4 Wochen intensivem Support

## User Stories & Akzeptanzkriterien

### US-1: Migrierte Vorgaenge finden
Als Sachbearbeiter moechte ich nach der Migration alle laufenden Vorgaenge im SaaS finden.
- AC: Alle migrierten Vorgaenge sichtbar und bearbeitbar, Fristen korrekt, Dokumente zugeordnet

### US-2: Statusberichte
Als Referatsleiter moechte ich woechentliche Statusberichte waehrend des Parallelbetriebs.
- AC: Report enthaelt migrierte Vorgaenge, Fehler, Legacy-Zugriffsstatistik

### US-3: Go/No-Go
Als Product Owner moechte ich auf Basis messbarer Kriterien entscheiden.
- AC: Go/No-Go-Checkliste vollstaendig, Rollback-Plan getestet

### US-4: Legacy nachschlagen
Als Sachbearbeiter moechte ich historische Vorgaenge im Legacy nachschlagen.
- AC: Legacy lesend verfuegbar, Suchfunktion funktioniert, kein Schreibzugriff

## Nicht-funktionale Anforderungen

- Datenvollstaendigkeit >= 99,5%
- SaaS Performance < 2s Seitenaufbau auch mit migrierten Daten
- Rollback innerhalb 2 Stunden
- RLS-Tests fuer migrierten Tenant gruen

## Spezialisten-Trigger

- DevOps: Staging, Deployment, Monitoring, Rollback
- QS Engineer: Datenvollstaendigkeit, RLS-Tests
- Security Engineer: Tenant-Isolation
- Backend Developer: Feature Flags

## Offene Fragen

1. Welche Kommune ist Pilotkunde?
2. Wie viele laufende Vorgaenge zum Stichtag?
3. Kann Legacy technisch auf Read-Only?
4. SLA waehrend Parallelbetrieb?

## Annahmen

- MIGRATION-1 abgeschlossen
- SaaS-MVP deckt Kern-Workflows ab (>= 95%)
- Legacy kann Read-Only gesetzt werden

## Abhaengigkeiten

- MIGRATION-1 -> Eingangsvoraussetzung
- SaaS-MVP deployed und stabil
- MIGRATION-3 -> Nachfolge-Phase

## Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Akzeptanzprobleme erfahrener SB | Hoch | Widerstand, Workarounds | Beteiligung, Schulung, Feedbackkanal |
| Rueckstandsaufbau | Mittel | Politisches Risiko | Personalreserve, Monitoring |
| Feature-Luecken im Produktivbetrieb | Mittel | SB blockiert | Testphase, Notfall-Legacy-Pfad |

## Rollback-Kriterium

Rollback bei: Datenverlust > 0,5%, Verfuegbarkeit < 95% ueber 3 Tage, Kern-Workflow blockiert, Rueckstand > 30% ueber 2 Wochen, oder PO No-Go.

Rollback-Ablauf: PO-Entscheidung -> FF_SAAS_PRIMARY aus -> FF_LEGACY_READ_ONLY aus -> Reverse-Migration -> Ursachenanalyse.
