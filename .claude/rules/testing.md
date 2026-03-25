# Testing Rules

> Diese Regeln gelten primär für den **Senior QS Engineer** (`.claude/agents/senior-qs-engineer.md`).
> Der **Senior Backend Developer** (`.claude/agents/senior-backend-developer.md`) beachtet „Unit Tests" und „API Tests" bei der Implementierung.
> Der **Senior Frontend Developer** (`.claude/agents/senior-frontend-developer.md`) beachtet „Komponenten-Tests" und „E2E Tests" bei der Implementierung.
> Der **DevOps/Platform Engineer** (`.claude/agents/devops-platform-engineer.md`) beachtet „Qualitätsgates" bei der CI/CD-Pipeline-Konfiguration.
> Der **Migration Architect** (`.claude/agents/migration-architect.md`) beachtet „Migrationstests" bei der Phasenplanung.

## Voraussetzungen
- Vor Testausführung prüfen: `node --version` und `npm --version` verfügbar?
- Dependencies installiert? `ls node_modules/.bin/jest` – falls nicht: `npm install` ausführen
- Jest-Konfiguration vorhanden? `ls jest.config*` – falls nicht:
  1. `npm install --save-dev jest ts-jest @types/jest`
  2. `jest.config.ts` mit `preset: "ts-jest"` und `moduleNameMapper` fuer `@/` Alias anlegen
  3. Testbefehl: `npx jest --forceExit` (forceExit wegen Timer-basiertem Code)

## Technologie
- **Unit / Integration**: Jest + Testing Library (React)
- **E2E**: Playwright
- **API-Tests**: Supertest oder Playwright API-Testing
- **Testdaten**: Supabase lokale Instanz (`supabase start`) oder dedizierte Test-Umgebung

## Testpyramide
- **Unit Tests** (Basis): Domänenlogik, Validierungsregeln, Hilfsfunktionen – schnell, isoliert
- **Integrationstests** (Mitte): API-Endpunkte, DB-Queries, RLS-Policy-Verhalten
- **E2E Tests** (Spitze): Kritische User Journeys – sparsam, stabil, wartbar
- Verhältnis anstreben: 70 % Unit / 20 % Integration / 10 % E2E

## Namenskonvention
- Testdateien: `<n>.test.ts` (Unit/Integration) / `<n>.spec.ts` (E2E)
- Ablageort Unit/Integration: neben der getesteten Datei (`src/.../<n>.test.ts`)
- Ablageort E2E: `tests/e2e/<feature-name>.spec.ts`
- Testbeschreibungen: `describe('Komponente/Funktion')` → `it('sollte ... wenn ...')`

## Pflichtabdeckung
Jedes Feature muss mindestens abdecken:
- **Happy Path**: Erwarteter Ablauf mit gültigen Eingaben
- **Randfälle**: Grenzwerte, leere Listen, maximale Längen
- **Negativfälle**: Ungültige Eingaben, fehlende Pflichtfelder
- **Fehlerfälle**: Netzwerkfehler, DB-Fehler, Auth-Fehler
- **RLS-Verhalten**: Kein Datenzugriff ohne korrekte Tenant-Authentifizierung
- **Auth-Verhalten**: Abgewiesene Requests ohne gültige Session

## RLS-Tests (Pflicht)
- Jede neue Tabelle erhält Integrationstests für alle vier RLS-Policies (SELECT, INSERT, UPDATE, DELETE)
- Testszenarien:
  - Authentifizierter User greift auf eigene Daten zu → erlaubt
  - Authentifizierter User greift auf fremde Tenant-Daten zu → verweigert
  - Nicht authentifizierter User → verweigert
- RLS-Tests laufen gegen eine echte Supabase-Testinstanz, nicht gegen Mocks

## Migrationstests
- Vor jedem Migrations-Cutover: Datenmigration in Nicht-Produktionsumgebung vollständig durchlaufen
- Prüfkriterien je Migrationsphase:
  - Datenvollständigkeit (Zeilenanzahl Quelle vs. Ziel)
  - Datenintegrität (Referenzen, Pflichtfelder, Formate)
  - Feature-Parität (alle Kern-Workflows im SaaS funktionsfähig)
  - RLS-Verhalten für migrierte Tenants korrekt
- Abnahme durch QS Engineer ist Eingangsvoraussetzung für Go-Entscheidung des Product Owners

## Externe Dependencies (API-Mocking)
- Externe HTTP-APIs (z.B. Anthropic, Supabase Edge Functions) in Unit-Tests IMMER mocken
- Mock-Responses muessen dem Zod-Schema der echten API entsprechen
- Pflicht-Testszenarien fuer externe APIs:
  - Happy Path (valide Response)
  - Timeout / Netzwerkfehler
  - Ungueltige Response (Schema-Verletzung)
  - Rate-Limiting der externen API (HTTP 429)
- Mock-Dateien unter `tests/fixtures/` oder inline im Testfile

## Qualitätsgates (CI/CD)
- Alle Unit- und Integrationstests müssen grün sein vor Merge in Hauptbranch
- E2E-Tests müssen grün sein vor Deployment in Produktionsumgebung
- **Testabdeckung ≥ 80 % für neue Dateien → Build schlägt fehl**
- Bei Einfuehrung oder Aenderung von `coverageThreshold`: einmalig `npx jest --forceExit --coverage` ausfuehren und pruefen, ob bestehender Code den Threshold erfuellt. Verletzungen in bestehenden Dateien dokumentieren oder per `coveragePathIgnorePatterns` ausschliessen.
- **Fehlgeschlagene RLS-Tests blockieren Deployment – keine Ausnahmen**
- Konfiguration liegt beim DevOps/Platform Engineer auf Basis dieser Vorgaben

## Testdaten
- Keine Produktionsdaten in Tests verwenden
- Testdaten als Fixtures oder Factories anlegen (`tests/fixtures/`)
- Tenant-Testdaten immer mit expliziter `tenant_id` anlegen
- Nach jedem Testlauf: Testdaten bereinigen (keine Seiteneffekte zwischen Tests)

## Barrierefreiheits-Tests (WCAG 2.2 Level AA / BITV 2.0)
- Verbindlicher Standard: **WCAG 2.2 Level AA** (entspricht BITV 2.0 / EN 301 549)
- `jest-axe` in Komponenten-Tests integrieren (automatisiert, jeder Build)
- `@axe-core/playwright` in E2E-Tests für kritische User Journeys (automatisiert)
- Lighthouse Accessibility Score ≥ 90 als CI/CD-Gate
- WCAG 2.2 Neuerungen explizit testen: Focus Not Obscured (2.4.11), Target Size (2.5.8), Consistent Help (3.2.6), Redundant Entry (3.3.7)
- Manuelle BITV-Prüfung (BIK-Prüfschritte, Stichprobe) vor `/qs-release`
- Vollständiger BIK BITV-Test vor Go-Live (extern oder intern, beauftragt durch Product Owner)

## Automatisierungsempfehlung
- Unit Tests: immer automatisieren
- Integrationstests: immer automatisieren
- E2E Happy Path je Feature: automatisieren
- Explorative Tests und Usability-Prüfungen: manuell durch QS Engineer
- Regressionstests für kritische Workflows: automatisieren, sobald stabil

## Human-in-the-Loop
- Testabdeckung für sicherheitskritische Bereiche (Auth, RLS, Tenant-Isolation) → Nutzer-Bestätigung vor Abnahme
- Abnahmeempfehlung (Go / No-Go) → immer durch Product Owner bestätigen lassen
