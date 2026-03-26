# PROJ-25: API-Route-Test-Template und Komponenten-Tests

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-26
**Herkunft:** PROJ-4 Retro Action Item A-5

---

## 1. Ziel / Problem

PROJ-4 hat 5 API-Routes und 4 Frontend-Komponenten ohne Tests. API-Route-Tests (Auth-Abweisung, Zod-Validierungsfehler, Security Headers) und Komponenten-Tests (Loading/Error/Empty States, Dialog-Validierung) fehlen. Gleiche Luecke droht bei PROJ-5ff. Ein wiederverwendbares Test-Template verhindert das.

## 2. Fachlicher Kontext & Stakeholder

- **QS Engineer:** Testluecken systematisch schliessen
- **Backend/Frontend Developer:** Weniger Boilerplate bei Tests

## 3. Funktionale Anforderungen

- FA-1: API-Route-Test-Helper in `tests/helpers/api-route-test.ts`
- FA-2: Helper-Funktionen: `testRequiresAuth()`, `testValidatesInput()`, `testReturnsSecurityHeaders()`
- FA-3: Komponenten-Test fuer alle PROJ-4 Komponenten (AmpelBadge, FristenPanel, Dialoge)
- FA-4: Hook-Test fuer `useFristen` mit gemocktem `fetch`
- FA-5: API-Route-Tests fuer alle 5 PROJ-4 Routes (mindestens Auth + Validierung)

## 4. User Stories & Akzeptanzkriterien

### US-1: API-Route-Test-Template
- AC-1: Helper existiert unter `tests/helpers/`
- AC-2: Jede PROJ-4 API-Route hat mindestens Tests fuer: 401 ohne Auth, 400 bei ungueltigem Input
- AC-3: Helper ist wiederverwendbar fuer zukuenftige Features

### US-2: Komponenten-Tests
- AC-1: Jede Komponente unter `src/components/fristen/` hat eine `*.test.tsx`-Datei
- AC-2: Tests decken ab: Happy Path, Empty State, Error State, Loading State
- AC-3: Dialog-Tests pruefen Pflichtfeld-Validierung

### US-3: Hook-Test
- AC-1: `use-fristen.test.ts` existiert
- AC-2: Alle 4 Aktionen (create, verlaengerung, hemmung, hebeAuf) getestet
- AC-3: 401-Redirect getestet

## 5. Nicht-funktionale Anforderungen

- NFR-1: Testabdeckung >= 80% fuer alle getesteten Dateien

## 6. Spezialisten-Trigger

- **Senior QS Engineer:** Test-Strategie und Templates
- **Senior Frontend Developer:** Komponenten-Tests
- **Senior Backend Developer:** API-Route-Tests

## 7. Offene Fragen

Keine.

## 8. Annahmen

- Jest + Testing Library sind bereits konfiguriert

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-4 (Fristmanagement) | Voraussetzung (zu testender Code) |

## 10. Fachliche Risiken

Keine.

## 11. Scope / Nicht-Scope

**Scope:** Test-Helpers, PROJ-4 Route-Tests, PROJ-4 Komponenten-Tests, Hook-Test
**Nicht-Scope:** RLS-Integrationstests (erfordern Supabase-Testinstanz), E2E-Tests
