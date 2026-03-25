# CLAUDE.md

Dieses Dokument ist die zentrale Steuerdatei für Claude Code in diesem Projekt.
Es definiert Verhalten, Struktur, Regeln und Einstiegspunkte für alle Agenten und Skills.

---

## Projektkontext

Dieses Projekt migriert eine bestehende **.NET On-Premise-Anwendung** schrittweise zu einer **SaaS-fähigen Webapplikation**.
Der Parallelbetrieb von Legacy und SaaS ist der Normalzustand während der Transition.

### Tech Stack
| Bereich | Technologie |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes, Zod (Validierung) |
| Datenbank | Supabase (PostgreSQL, Row Level Security, Auth) |
| .NET-Client | .NET Framework 4.8, WebView2, xUnit |
| Testing | Jest, Testing Library, Playwright (SaaS); xUnit (.NET) |
| Deployment | Vercel (Next.js Hosting), Supabase Cloud (Datenbank) |

---

## Dateistruktur

```
.claude/
├── rules/          ← Verbindliche Regelwerke (werden von Agenten und Skills referenziert)
├── agents/         ← Rollen-Prompts (13 Agenten)
└── skills/         ← Skills (40 ausführbare Workflows, Aufruf mit /skillname)

features/           ← Feature-Specs (PROJ-X-*.md) und Migrations-Phasen (MIGRATION-X-*.md)
features/INDEX.md   ← Zentrales Feature- und Migrations-Register (vor jeder Arbeit lesen)
docs/adr/           ← Architecture Decision Records
docs/adr/README.md  ← ADR-Index
Input/              ← 16 Landesbauordnungen als PDF (fachliche Quelldokumente)
```

---

## Regelwerke

Alle Regelwerke liegen unter `.claude/rules/` und gelten **verbindlich**.
Agenten und Skills referenzieren sie direkt – nie aus dem Gedächtnis ableiten.

| Datei | Primäre Verantwortung |
|---|---|
| `.claude/rules/general.md` | Projektstruktur, Git-Konventionen, INDEX.md-Pflege, Human-in-the-Loop, Qualitätsgates |
| `.claude/rules/backend.md` | Supabase, Zod, API Routes, RLS, Query Patterns |
| `.claude/rules/frontend.md` | shadcn/ui-Pflicht, Tailwind CSS, Auth Best Practices |
| `.claude/rules/security.md` | Secrets, Input Validation, Authentication, Security Headers, Multi-Tenancy |
| `.claude/rules/database.md` | Schema-Design, RLS, Indizes, Migrationen, Multi-Tenancy-Modelle |
| `.claude/rules/migration.md` | Strangler Fig, Feature Flags, Dual-Write, Cutover-Kriterien, Rollback |
| `.claude/rules/testing.md` | Testpyramide, Namenskonventionen, RLS-Tests, Qualitätsgates, Migrationstests |

---

## Agenten

Alle Agenten liegen unter `.claude/agents/`.
Jeder Agent hat einen **`## Übergabe`-Block** mit eingehenden und ausgehenden Übergabepunkten.

| Agent | Verantwortung |
|---|---|
| `senior-produktmanager.md` | Strategie, Roadmap, Marktanalyse, Stakeholder |
| `product-owner.md` | Backlog, Scope, MVP, Abnahme |
| `requirements-engineer.md` | User Stories, NFRs, Akzeptanzkriterien |
| `senior-software-architect.md` | Zielarchitektur, Komponenten, Schnittstellen, ADRs |
| `database-architect.md` | Schema, RLS, Indizes, Migrationen, Multi-Tenancy |
| `senior-ui-ux-designer.md` | UI-Konzepte, Design-System, Accessibility, Handoff |
| `senior-backend-developer.md` | API-Endpunkte, Domänenlogik, Persistenz, Zod |
| `senior-frontend-developer.md` | Komponenten, State Management, API-Integration |
| `senior-qs-engineer.md` | Teststrategie, Testfälle, RLS-Tests, Abnahme |
| `devops-platform-engineer.md` | CI/CD, Deployment, Monitoring, Security-Hardening |
| `senior-security-engineer.md` | Threat Modeling, Audit, RLS-Prüfung, Compliance |
| `migration-architect.md` | Migrationsphasen, Cutover, Feature Flags, Dekommissionierung |
| `technical-writer.md` | Dokumentation, ADRs, API-Referenz, Release Notes |

---

## Skills (Commands)

Alle Skills liegen unter `.claude/skills/<skillname>/SKILL.md` und werden mit `/skillname` aufgerufen.
Jeder Skill liest zuerst relevante Dateien, agiert als definierter Agent und schlägt am Ende den nächsten Schritt vor.
**Übergaben sind immer nutzerinitiiert – keine automatischen Weiterleitungen.**

### Strategie & Planung
| Skill | Beschreibung |
|---|---|
| `/pm-roadmap` | Strategische Roadmap erstellen / aktualisieren |
| `/pm-market` | Markt- und Wettbewerbsanalyse |
| `/pm-stakeholder` | Stakeholder-Kommunikation / Entscheidungsvorlage |
| `/po-backlog` | Backlog-Items anlegen, Security-Eskalationen priorisieren |
| `/po-scope` | Scope und Nicht-Scope verbindlich definieren |
| `/po-mvp` | MVP-Schnitt für ein Feature |
| `/po-review` | Fachliche Abnahme (Go / No-Go) |

### Anforderungen & Architektur
| Skill | Beschreibung |
|---|---|
| `/req-stories` | User Stories mit Akzeptanzkriterien erstellen |
| `/req-nfr` | Nicht-funktionale Anforderungen definieren |
| `/req-refine` | Anforderungen verfeinern und konsolidieren |
| `/arch-design` | Technische Zielarchitektur entwerfen |
| `/arch-adr` | Architecture Decision Record erstellen |
| `/arch-review` | Architektur-Review durchführen |

### Datenbank
| Skill | Beschreibung |
|---|---|
| `/db-schema` | Schema, RLS-Policies, Indizes und Migrations-Script erstellen |
| `/db-migration` | Zero-Downtime-Migration planen und erstellen |
| `/db-performance` | Queries und Indizes analysieren und optimieren |

### UI/UX Design
| Skill | Beschreibung |
|---|---|
| `/ux-concept` | UI/UX-Konzept für ein Feature entwickeln |
| `/ux-review` | UI-Komponenten auf Usability und Accessibility prüfen |
| `/ux-handoff` | Implementierungsreifen Design-Handoff erstellen |

### Implementierung
| Skill | Beschreibung |
|---|---|
| `/backend-api` | API-Endpunkte implementieren |
| `/backend-logic` | Business-Logik implementieren / refaktorieren |
| `/backend-review` | Backend-Code-Review |
| `/frontend-component` | React-Komponenten implementieren |
| `/frontend-integrate` | Frontend an Backend-APIs anbinden |
| `/frontend-review` | Frontend-Code-Review |
| `/xbau-validate` | XBau-Sample-XMLs generieren und Validierung vorbereiten |

### Qualität & Betrieb
| Skill | Beschreibung |
|---|---|
| `/qs-testplan` | Vollständigen Testplan erstellen |
| `/qs-review` | Implementierung verifizieren |
| `/qs-release` | QS-Bericht und Abnahmeempfehlung erstellen |
| `/devops-pipeline` | CI/CD-Pipeline analysieren und verbessern |
| `/devops-deploy` | Deployment planen und durchführen |
| `/devops-ops` | Betriebszustand und Monitoring analysieren |

### Security
| Skill | Beschreibung |
|---|---|
| `/sec-audit` | Vollständigen Sicherheits-Audit durchführen |
| `/sec-threatmodel` | Bedrohungsmodell (STRIDE) erstellen |
| `/sec-review` | Sicherheitsfokussiertes Code-Review |

### Migration
| Skill | Beschreibung |
|---|---|
| `/migration-plan` | Migrationsphase planen, INDEX.md schreiben |
| `/migration-cutover` | Cutover vorbereiten, Go/No-Go-Kriterien prüfen |

### Dokumentation
| Skill | Beschreibung |
|---|---|
| `/docs-write` | Technische Dokumentation erstellen / aktualisieren |
| `/docs-adr` | ADR in Index einpflegen |

### System-Optimierung
| Skill | Beschreibung |
|---|---|
| `/meta-optimize` | Reibungspunkte im Agenten-/Skill-/Rules-System identifizieren und Verbesserungen vorschlagen |

---

## Typische Workflows

### Neues Feature entwickeln
```
/po-backlog → /req-stories → /req-nfr → /arch-design
→ /sec-threatmodel (bei sicherheitskritischen Features: Admin, Auth, Multi-Tenancy)
→ /db-schema → /ux-concept → /ux-handoff → /backend-api
→ /frontend-component → /frontend-integrate → /qs-testplan
→ /qs-review → /sec-review → /qs-release → /po-review
→ /devops-deploy → /docs-write
```

### Sicherheits-Audit
```
/sec-audit → (bei Befund) /sec-review → /po-backlog (Eskalation)
```

### Migrations-Phase starten
```
/migration-plan → /db-schema → /backend-api → /qs-testplan
→ /qs-review → /qs-release → /migration-cutover → /devops-deploy
```

### Architekturentscheidung dokumentieren
```
/arch-design → /arch-adr → /docs-adr
```

### Bugfix
```
/po-backlog (Bug melden) → /req-stories (Akzeptanzkriterien für Fix)
→ /backend-api oder /frontend-component (Fix implementieren)
→ /qs-review → /po-review → /devops-deploy
```
Für offensichtliche Minor-Fixes (Tippfehler, falscher Modellname, CSS-Fix) darf die Feature-Spec
auf die Pflichtstruktur reduziert werden: Ziel/Problem, 1 User Story, Abhängigkeiten.
Die Schritte `/req-nfr`, `/arch-design`, `/ux-concept` entfallen bei Minor-Fixes.

### Design / Visuelles Rebranding
```
/po-backlog → /ux-concept → /ux-handoff → /frontend-component
→ /qs-review → /qs-release → /po-review → /devops-deploy
```

### Technische Items (Refactoring, Tests, Dependencies, Infrastruktur)
```
Spec existiert → Implementierung direkt → Tests + Build → Deployed
```
Technische Items dürfen den verkürzten Workflow nutzen, wenn ALLE Bedingungen erfüllt sind:
1. Keine fachliche Verhaltensänderung für Endnutzer
2. Feature-Spec mit mindestens 1 AC existiert
3. Alle Tests grün + Build erfolgreich

Kein `/qs-release`, `/po-review`, `/frontend-review` erforderlich.
Die Qualitätssicherung erfolgt über Tests und Build-Verifikation.

### Security-Hotfix
```
/sec-audit (Befund) → /po-backlog (SEC-HOTFIX-X, sofort In Progress)
→ /sec-review → /backend-api (Fix) → /qs-review → /devops-deploy
```

### Umfassende Code Review
```
Code Review (4 Agenten parallel: Security, Frontend, Architektur, QS)
→ Befundbericht → optional: zweiter Durchgang (vertieft)
→ /po-backlog (Befunde als priorisierte Items anlegen)
→ Implementierung der priorisierten Items im regulären Workflow
```

### System-Optimierung
```
/meta-optimize → (je Befund) Nutzer-Bestätigung → meta(SYS)-Commit
```

---

## Nicht verhandelbare Qualitätsgates

Diese Gates gelten für alle Agenten und Skills ohne Ausnahme:

| Gate | Regel |
|---|---|
| **RLS** | Jede Tabelle hat RLS. RLS-Tests müssen grün sein vor Deployment. |
| **Zod** | Alle Eingaben serverseitig mit Zod validieren. |
| **Testabdeckung** | ≥ 80 % für neue Dateien (erzwungen in CI/CD). |
| **Deployment-Reihenfolge** | DB-Migration → Backend → Frontend (zwingend). |
| **Secrets** | Niemals in Git. Immer in `.env.local.example` dokumentieren. |
| **Cutover** | Kein Cutover ohne verifizierten Rollback-Plan und explizite Go-Entscheidung des Product Owners. |
| **Cross-Tenant** | Sofortige Eskalation bei Fund. Kein selbstständiges Weitermachen. |
| **Prozess-Pflicht** | KEINE Code-Änderung (src/, supabase/) ohne PROJ-ID und Feature-Spec. Bei direkter Anfrage: STOPP, `/po-backlog` vorschlagen. Größe ist kein Kriterium. |

---

## Human-in-the-Loop

Folgende Aktionen erfordern **immer** explizite Nutzer-Bestätigung:

- Änderungen an RLS-Policies
- Änderungen am Auth-Flow
- Destruktive Migrationen (DROP, Spalten entfernen)
- Neue Umgebungsvariablen (→ `.env.local.example` aktualisieren)
- Go / No-Go-Entscheidungen (Abnahme, Cutover)
- Dekommissionierung der Legacy-Anwendung
- Destruktive Deployment-Schritte
- Änderungen durch `/meta-optimize` an `.claude/` oder `CLAUDE.md` → jede Änderung einzeln bestätigen lassen

---

## INDEX.md-Pflege

Jeder Skill, der eine Phase abschließt, schreibt den Status zurück:

| Skill | Aktion |
|---|---|
| `/po-backlog` | Neue Feature-ID anlegen → `Planned` |
| `/req-stories` | Status → `In Progress` |
| `/qs-release` | Status → `In Review` |
| `/po-review` | Status → `Deployed` (nach Go) |
| `/migration-plan` | Neue MIGRATION-ID anlegen → `Planned` |
| `/migration-cutover` | Status → `Deployed` nach Cutover |
| `/docs-write` | Status → `Deployed` nach Release-Dokumentation |

---

## Commit-Format (zwingend)

```
type(PROJ-X): beschreibung
```

Typen: `feat` · `fix` · `refactor` · `test` · `docs` · `deploy` · `chore` · `meta`

- `meta(SYS): beschreibung` – für Änderungen am Agenten-/Skill-/Rules-System

Beispiele:
```
feat(PROJ-12): add RLS policy for tenant isolation
fix(PROJ-12): correct auth redirect after login
docs(PROJ-12): update API reference for /orders endpoint
meta(SYS): add missing RLS check step to backend-api skill
```
