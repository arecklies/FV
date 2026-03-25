# MIGRATION-1: Datenanalyse und Migrationsstrategie

**Status:** Planned
**Erstellt:** 2026-03-25
**Migrationsmuster:** Strangler Fig (Vorbereitung)

---

## Ziel / Problem

Die bestehende .NET On-Premise-Anwendung enthaelt gewachsene Datenbestaende aus teilweise ueber 15 Jahren Betrieb. Bevor eine Migration in die SaaS-Plattform stattfinden kann, muessen Datenqualitaet, Datenvolumen und Transformationsregeln systematisch erfasst werden.

## Fachlicher Kontext & Stakeholder

| Stakeholder | Interesse |
|---|---|
| Sachbearbeiter (P1) | Vollstaendigkeit der migrierten Vorgaenge |
| Referatsleiter (P3) | Testmigration und schriftliche Abnahme |
| Amtsleiter (P4) | Kein Datenverlust, nachweisbare Qualitaet |
| Database Architect | Mapping Legacy auf SaaS-Schema |
| Security Engineer | PII-Kennzeichnung, DSGVO |

## Funktionale Anforderungen

- FA-1: Vollstaendiger Legacy-Datenexport (CSV/XML)
- FA-2: Datenqualitaetsanalyse (Vollstaendigkeit, Konsistenz, Duplikate, Status-Integritaet)
- FA-3: Datenfeld-Mapping Legacy -> SaaS mit Transformationsregeln
- FA-4: Bereinigungsstrategie (was bereinigen, was verwerfen, was archivieren)
- FA-5: Migrationsskript-Prototyp (Test gegen >= 100 Vorgaenge)
- FA-6: Tenant-Mapping (Legacy-Entitaet -> SaaS-Tenant)

## User Stories & Akzeptanzkriterien

### US-1: Datenexport
Als Database Architect moechte ich einen vollstaendigen Datenexport, damit ich das Mapping erstellen kann.
- AC: Export enthaelt alle Entitaeten, Format ist maschinenlesbar, PII gekennzeichnet

### US-2: Datenqualitaetsbericht
Als Migration Architect moechte ich einen Qualitaetsbericht, damit ich Aufwand und Bereinigung einschaetzen kann.
- AC: Alle Domaenen abgedeckt, Befunde klassifiziert (kritisch/hoch/mittel/niedrig), vom QS Engineer abgenommen

### US-3: Datenfeld-Mapping
Als Product Owner moechte ich ein Mapping-Dokument, damit ich Feature-Paritaet bewerten kann.
- AC: Jedes Legacy-Feld hat Status (migriert/verworfen/archiviert), Transformationen beschrieben

## Nicht-funktionale Anforderungen

- DSGVO-konforme PII-Behandlung bei Export und Analyse
- Alle Mapping-Entscheidungen begruendet und dokumentiert
- Export muss wiederholbar sein (fuer Delta-Migrationen)

## Spezialisten-Trigger

- Database Architect: Datenmodell-Analyse, Mapping
- Security Engineer: PII-Klassifizierung
- QS Engineer: Abnahme Qualitaetsbericht
- Product Owner: Entscheidung verworfene Felder

## Offene Fragen

1. Welches Legacy-System ist im Einsatz? Format des Datenexports?
2. Gibt es bestehende Export-Werkzeuge oder nur Datenbank-Zugriff?
3. Welche Kommune ist Pilot?
4. Historische Vorgaenge nur als PDF-Archiv? Ab welchem Jahrgang?

## Annahmen

- Legacy erlaubt vollstaendigen Datenexport
- SaaS-MVP mit Kern-Entitaeten ist deployed
- Pilotkommune ist identifiziert
- AVV mit Pilotkommune vorhanden

## Abhaengigkeiten

- SaaS-MVP (Kern-Entitaeten) -> Eingangsvoraussetzung
- ADR-007 (Multi-Tenancy) -> Eingangsvoraussetzung
- MIGRATION-2 -> Nachfolge-Phase

## Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Datenqualitaet schlechter als erwartet | Hoch | Aufwand steigt | Fruehe Stichproben, Bereinigungsbudget |
| Datenmodell-Unterschiede gross | Mittel | Komplexe Transformationen | Iteratives Mapping mit PO |
| PII in unerwarteten Feldern | Mittel | DSGVO-Risiko | Security Engineer frueh einbinden |

## Eingangskriterien

- [ ] SaaS-MVP deployed
- [ ] ADR-007 entschieden
- [ ] Pilotkommune identifiziert
- [ ] Legacy-Zugang technisch moeglich
- [ ] AVV unterschrieben

## Ausgangskriterien

- [ ] Datenqualitaetsbericht abgenommen
- [ ] Mapping vollstaendig dokumentiert
- [ ] Bereinigungsstrategie vom PO freigegeben
- [ ] Migrationsskript-Prototyp erfolgreich gegen Testdaten
- [ ] PII-Klassifizierung abgenommen
