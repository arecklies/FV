# Feature Index

> Central tracking for all features. Updated by skills automatically.

## Status Legend
- **Planned** - Requirements written, ready for development
- **In Progress** - Currently being built
- **In Review** - QA testing in progress
- **Deployed** - Live in production

## Features

### Phase 0 - Fundament

| ID | Feature | Status | Spec | Created |
|----|---------|--------|------|---------|
| PROJ-1 | Auth und Benutzerverwaltung | Deployed | [PROJ-1](PROJ-1-auth-benutzerverwaltung.md) | 2026-03-25 |
| PROJ-2 | Mandanten-Schema und RLS | Planned | [PROJ-2](PROJ-2-mandanten-schema-rls.md) | 2026-03-25 |

### Phase 1 - Kern-MVP

| ID | Feature | Status | Spec | Created |
|----|---------|--------|------|---------|
| PROJ-3 | Vorgangsverwaltung | Deployed | [PROJ-3](PROJ-3-vorgangsverwaltung.md) | 2026-03-25 |
| PROJ-4 | Fristmanagement | Deployed | [PROJ-4](PROJ-4-fristmanagement.md) | 2026-03-25 |
| PROJ-5 | Dokumentenverwaltung | Planned | [PROJ-5](PROJ-5-dokumentenverwaltung.md) | 2026-03-25 |
| PROJ-6 | Bescheiderzeugung | Planned | [PROJ-6](PROJ-6-bescheiderzeugung.md) | 2026-03-25 |
| PROJ-7 | XBau-Basisschnittstelle | Planned | [PROJ-7](PROJ-7-xbau-basisschnittstelle.md) | 2026-03-25 |
| PROJ-8 | Vollstaendiger Datenexport | Planned | [PROJ-8](PROJ-8-datenexport.md) | 2026-03-25 |

### Phase 1 - Kern-MVP (Erweiterung)

| ID | Feature | Status | Spec | Created |
|----|---------|--------|------|---------|
| PROJ-12 | Beteiligungsmanagement (ToEB) | Planned | | 2026-03-25 |
| PROJ-17 | Massenoperationen Vorgangsliste | Planned | [PROJ-17](PROJ-17-massenoperationen.md) | 2026-03-26 |
| PROJ-19 | Auto-Fristen bei Workflow-Schritt-Wechsel | Deployed | [PROJ-19](PROJ-19-auto-fristen-workflow.md) | 2026-03-26 |
| PROJ-20 | Frist-Ampel in Vorgangsliste | Deployed | [PROJ-20](PROJ-20-frist-ampel-vorgangsliste.md) | 2026-03-26 |
| PROJ-21 | Frist-Dashboard Sachbearbeiter-Gruppierung | Deployed | [PROJ-21](PROJ-21-frist-dashboard-gruppierung.md) | 2026-03-26 |
| PROJ-22 | Cron-Job Feiertags-Korrektheit und Batch-Optimierung | Planned | [PROJ-22](PROJ-22-cron-feiertage-fix.md) | 2026-03-26 |
| PROJ-23 | AmpelStatus Typ-Konsolidierung | Planned | [PROJ-23](PROJ-23-ampelstatus-typ-konsolidierung.md) | 2026-03-26 |
| PROJ-24 | Typisiertes ServiceResult Error-Modell | Planned | [PROJ-24](PROJ-24-typisiertes-service-error-modell.md) | 2026-03-26 |
| PROJ-25 | API-Route-Test-Template und Komponenten-Tests | Planned | [PROJ-25](PROJ-25-test-templates-komponententests.md) | 2026-03-26 |
| PROJ-26 | Dialog-State-Reset | Planned | [PROJ-26](PROJ-26-dialog-state-reset.md) | 2026-03-26 |
| PROJ-27 | Route-Handler-Utilities | Planned | [PROJ-27](PROJ-27-route-handler-utilities.md) | 2026-03-26 |
| PROJ-28 | Nicht-gesetzliche Fristen (intern) | Planned | [PROJ-28](PROJ-28-nicht-gesetzliche-fristen.md) | 2026-03-26 |
| PROJ-29 | Persoenliche Tagesansicht | Planned | [PROJ-29](PROJ-29-persoenliche-tagesansicht.md) | 2026-03-26 |
| PROJ-30 | Workflow-Aktionen mit Kontextinformation | Planned | [PROJ-30](PROJ-30-workflow-aktionen-kontext.md) | 2026-03-26 |

> PROJ-12 vorgezogen von Phase 2 auf Phase 1 (Umfrage: SB bewerten 4,47/5, Rang 3 der operativen Features)
> PROJ-17 aus PROJ-3 US-6 extrahiert (Retro A-8: MVP-Scope frueher schneiden)
> PROJ-19/20/21 aus PROJ-4 QS-Review extrahiert (offene ACs als separate Items)
> PROJ-22-27 aus PROJ-4 Retro extrahiert (technische Schulden + Prozessverbesserungen)
> PROJ-28/29 aus Kundentermin 26.03.2026 (Feedback F-05: interne Fristen, F-08: Tagesansicht)
> PROJ-33 vorgezogen aus PROJ-9 (Phase 2): Pilotblocker Soest + Leipzig (Zoom-Demo 27.03.2026)
> PROJ-34 aus Dortmund-Feedback: Ampel-Schwellenwerte zu starr (Zoom-Demo 27.03.2026)

### Phase 2 - Compliance und Integration

| ID | Feature | Status | Spec | Created |
|----|---------|--------|------|---------|
| PROJ-9 | Vier-Augen-Freigabeworkflow | Planned | | 2026-03-25 |
| PROJ-10 | Audit-Trail (revisionssicher) | Planned | | 2026-03-25 |
| PROJ-11 | XTA-Anbindung (OSCI-Transport) | Planned | [PROJ-11](PROJ-11-xta-anbindung.md) | 2026-03-25 |
| PROJ-18 | FIT-Connect-Anbindung (OZG-Portal) | Planned | [PROJ-18](PROJ-18-fit-connect.md) | 2026-03-26 |

> PROJ-11 umbenannt: XTA statt FIT-Connect (Kundenfeedback 2026-03-26: Bestandskunden haben kein FIT-Connect)
> PROJ-18 neu: FIT-Connect als strategisches Ziel in Phase 3, XTA-Sunset nach Migration

### Phase 3 - Fuehrung und Optimierung

| ID | Feature | Status | Spec | Created |
|----|---------|--------|------|---------|
| PROJ-13 | Fuehrungs-Dashboard und Reporting | Planned | | 2026-03-25 |
| PROJ-14 | Gebuehrenberechnung nach Landesrecht | Planned | | 2026-03-25 |
| PROJ-15 | PWA Offline-Lesemodus | Planned | | 2026-03-25 |
| PROJ-16 | Schulungskonzept und In-App-Onboarding | Planned | | 2026-03-25 |

## Migrations-Phasen

| ID | Phase | Status | Spec | Created |
|----|-------|--------|------|---------|
| MIGRATION-1 | Datenanalyse und Migrationsstrategie | Planned | [MIGRATION-1](MIGRATION-1-datenanalyse-und-strategie.md) | 2026-03-25 |
| MIGRATION-2 | Pilotmigration mit Stichtagsmodell | Planned | [MIGRATION-2](MIGRATION-2-pilotmigration.md) | 2026-03-25 |
| MIGRATION-3 | Rollout und Legacy-Dekommissionierung | Planned | [MIGRATION-3](MIGRATION-3-rollout-und-dekommissionierung.md) | 2026-03-25 |

| PROJ-31 | Visuelles Redesign und Branding | Planned | [PROJ-31](PROJ-31-visuelles-redesign.md) | 2026-03-26 |
| PROJ-32 | Kundenrückmeldungen (Sammelitem) | Planned | [PROJ-32](PROJ-32-kundenrueckmeldungen.md) | 2026-03-27 |
| PROJ-33 | Vier-Augen-Lite (einfache Freigabe) | Planned | [PROJ-33](PROJ-33-vier-augen-lite.md) | 2026-03-27 |
| PROJ-34 | Konfigurierbare Ampel-Schwellenwerte | Planned | [PROJ-34](PROJ-34-konfigurierbare-ampel-schwellenwerte.md) | 2026-03-27 |

> PROJ-30 Quick-Fix: Workflow-Aktionen mit Kontextinformation
> PROJ-31 aus Demo-Feedback: UI wirkt langweilig

## Next Available ID: PROJ-35
