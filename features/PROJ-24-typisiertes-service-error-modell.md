# PROJ-24: Typisiertes ServiceResult Error-Modell

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-26
**Herkunft:** PROJ-4 Retro Action Item A-4

---

## 1. Ziel / Problem

Services geben Fehler als freie Strings zurueck (`"Frist nicht gefunden"`). API-Routes matchen per String-Vergleich fuer HTTP-Status-Zuordnung. Das ist fragil und bricht bei Textaenderungen. Betrifft FristService, VerfahrenService und zukuenftige Services.

## 2. Fachlicher Kontext & Stakeholder

- **Backend Developer:** Robusteres Error-Handling, weniger fragile String-Matches
- **Architekt:** Querschnittsthema fuer alle Services

## 3. Funktionale Anforderungen

- FA-1: `ServiceResult<T>` Typ in `src/lib/services/result.ts`
- FA-2: Typisierte Error-Codes: `NOT_FOUND`, `CONFLICT`, `DB_ERROR`, `VALIDATION_ERROR`
- FA-3: FristService auf `ServiceResult` migrieren
- FA-4: API-Routes nutzen `switch (result.code)` statt String-Matching

## 4. User Stories & Akzeptanzkriterien

### US-1: Typisierte Service-Fehler
- AC-1: `ServiceResult<T> = { ok: true; data: T } | { ok: false; code: ErrorCode; message: string }`
- AC-2: Alle FristService-Funktionen (8 Stueck) geben `ServiceResult` zurueck
- AC-3: Kein String-Matching mehr in API-Routes fuer Error-Typ-Erkennung
- AC-4: Bestehende Tests weiterhin gruen

## 5. Nicht-funktionale Anforderungen

- NFR-1: Abwaertskompatibel — VerfahrenService und WorkflowService koennen schrittweise migriert werden

## 6. Spezialisten-Trigger

- **Senior Backend Developer:** Utility + Migration

## 7. Offene Fragen

Keine.

## 8. Annahmen

- VerfahrenService (PROJ-3) wird in einem separaten Schritt migriert

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-4 (Fristmanagement) | Voraussetzung (erster Consumer) |

## 10. Fachliche Risiken

Keine.

## 11. Scope / Nicht-Scope

**Scope:** ServiceResult-Typ, FristService-Migration, zugehoerige API-Routes
**Nicht-Scope:** Migration von VerfahrenService/WorkflowService (eigenes Item)
