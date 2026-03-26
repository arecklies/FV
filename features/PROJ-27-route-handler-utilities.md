# PROJ-27: Route-Handler-Utilities

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-26
**Herkunft:** PROJ-4 Retro Action Item A-8

---

## 1. Ziel / Problem

API-Routes wiederholen 15-20 Zeilen identischen Boilerplate: `requireAuth()` + `isAuthContext()` + `UuidParamSchema.safeParse()` + Zod-Body-Parsing mit identischem `catch`-Block. Das erzeugt Fehlerquellen (vergessene Auth-Pruefung, vergessene UUID-Validierung) und unnoetige Codelaenge.

## 2. Fachlicher Kontext & Stakeholder

- **Backend Developer:** Weniger Boilerplate, geringeres Fehlerrisiko

## 3. Funktionale Anforderungen

- FA-1: `parseJsonBody<T>(request, schema)` in `src/lib/api/` — gibt validierte Daten oder 400-Response zurueck
- FA-2: `validateVorgangAccess(serviceClient, tenantId, vorgangId)` — kombiniert UUID-Validierung + `getVorgang()` + 404-Response
- FA-3: Bestehende PROJ-4 Routes optional auf neue Utilities migrieren

## 4. User Stories & Akzeptanzkriterien

### US-1: Route-Handler-Utilities
- AC-1: `parseJsonBody` existiert und wird in mindestens einer Route verwendet
- AC-2: `validateVorgangAccess` existiert und wird in mindestens einer Route verwendet
- AC-3: Bestehende Tests weiterhin gruen
- AC-4: Neue Utilities haben eigene Unit-Tests

## 5. Nicht-funktionale Anforderungen

- NFR-1: Abwaertskompatibel — bestehende Routes koennen schrittweise migriert werden

## 6. Spezialisten-Trigger

- **Senior Backend Developer:** Utility-Implementierung

## 7. Offene Fragen

Keine.

## 8. Annahmen

Keine.

## 9. Abhaengigkeiten

Keine (eigenstaendig).

## 10. Fachliche Risiken

Keine.

## 11. Scope / Nicht-Scope

**Scope:** Zwei Utility-Funktionen + Tests + optionale Migration von PROJ-4 Routes
**Nicht-Scope:** Migration aller bestehenden Routes (kann inkrementell erfolgen)
