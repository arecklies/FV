# PROJ-45: service-bw REST-API Evaluation (Spike)

**Status:** Planned | **Phase:** 2 (Compliance und Integration) | **Erstellt:** 2026-03-28
**Herkunft:** Kunden-Session 28.03.2026, F-10 (Herr Yilmaz, Freiburg, P1)
**Prioritaet:** Hoch (Pilotblocker Freiburg)

---

## 1. Ziel / Problem

In Freiburg kommen ~40% der Bauanträge digital über service-bw (Landesportal BW). service-bw nutzt weder XTA noch FIT-Connect, sondern eine eigene REST-API. Ohne Import-Möglichkeit müssten Anträge doppelt erfasst werden. Vor einer Implementierungsentscheidung muss die API evaluiert werden.

## 2. Fachlicher Kontext & Stakeholder

- **P1 (Erfahrener SB, Freiburg):** "40% der Anträge kommen digital über service-bw"
- **PROJ-11** (XTA): Bestandskunden NRW
- **PROJ-18** (FIT-Connect): Strategisches Ziel
- **service-bw:** Drittes Portal-Protokoll neben XTA und FIT-Connect

## 3. Funktionale Anforderungen (Spike-Ergebnis)

- FA-1: API-Dokumentation von service-bw beschaffen und analysieren
- FA-2: Datenformat und Mapping zu XBau/internem Modell bewerten
- FA-3: Authentifizierung und Autorisierung evaluieren
- FA-4: Go/No-Go-Empfehlung für Integration

## 4. User Stories & Akzeptanzkriterien

### US-1: Evaluationsbericht
Als Product Owner möchte ich einen Evaluationsbericht über die service-bw-API, damit ich über die Integration entscheiden kann.
- AC-1: API-Dokumentation liegt vor
- AC-2: Datenformat dokumentiert (Felder, Mapping zu internem Modell)
- AC-3: Aufwandschätzung für Integration (S/M/L/XL)
- AC-4: Go/No-Go-Empfehlung mit Begründung

## 6. Spezialisten-Trigger

- **Senior Software Architect:** API-Bewertung, Integrationsmuster
- **Senior Backend Developer:** Technische Machbarkeit
- **Migration Architect:** Eingangskanal-Strategie (XTA + FIT-Connect + service-bw)

## 9. Abhaengigkeiten

- PROJ-44 (LBO BW): Freiburg-Pilotierung nur sinnvoll wenn beides gelöst
- PROJ-11 (XTA), PROJ-18 (FIT-Connect): Eingangskanal-Architektur

## 11. Scope / Nicht-Scope

**Scope:** Evaluation und Bericht (kein Code)
**Nicht-Scope:** Implementierung der Integration (eigenes Item nach Go)
