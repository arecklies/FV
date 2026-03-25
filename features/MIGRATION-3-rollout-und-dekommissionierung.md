# MIGRATION-3: Rollout und Legacy-Dekommissionierung

**Status:** Planned
**Erstellt:** 2026-03-25
**Migrationsmuster:** Strangler Fig (Rollout + Dekommissionierung)

---

## Ziel / Problem

Nach erfolgreicher Pilotmigration werden verbleibende Kommunen schrittweise migriert. Am Ende wird das Legacy-System dekommissioniert.

## Fachlicher Kontext & Stakeholder

| Stakeholder | Interesse |
|---|---|
| Amtsleiter (P4) | Budget, Zeitplan, Kosteneinsparung durch Legacy-Abschaltung |
| Senior PM | Kommunen-Priorisierung, Rollout-Steuerung |
| DevOps | Skalierung, Monitoring fuer wachsende Tenants |

## Funktionale Anforderungen

- FA-1: Onboarding-Reihenfolge nach Komplexitaet (Datenvolumen, Sonderschnittstellen, Bereitschaft)
- FA-2: Standardisiertes Migrationspaket (Skript, Bereinigung, Templates, Schulung, Rollback)
- FA-3: Feature Flags je Tenant individuell steuerbar
- FA-4: Monitoring-Dashboard fuer alle Tenants (Verfuegbarkeit, Fehlerrate, RLS)
- FA-5: Legacy-Dekommissionierung nach Checkliste

## User Stories & Akzeptanzkriterien

### US-1: Onboarding-Reihenfolge
Als Senior PM moechte ich eine priorisierte Reihenfolge, damit ich Ressourcen planen kann.
- AC: Alle Kommunen klassifiziert, Reihenfolge mit PO abgestimmt, Zeitfenster definiert

### US-2: Dekommissionierung
Als Amtsleiter moechte ich Bestaetigung, dass Legacy sicher abgeschaltet werden kann.
- AC: Checkliste vollstaendig, PO + PM haben freigegeben, Datensicherung erstellt

## Nicht-funktionale Anforderungen

- System bleibt performant mit jedem Tenant (Tests nach jeder 5. Migration)
- Migrationszeit < 4h je Kommune
- Legacy-Archiv >= 10 Jahre verfuegbar

## Spezialisten-Trigger

- Senior PM: Kommunen-Priorisierung
- DevOps: Skalierung, Dekommissionierung
- QS Engineer: Abnahme je Kommune
- Security Engineer: Cross-Tenant-Isolation bei wachsender Mandantenzahl

## Offene Fragen

1. Wie viele Kommunen insgesamt?
2. Kosten fuer Legacy-Betrieb waehrend Uebergang?
3. Aufbewahrungsfrist Legacy-Archiv?

## Annahmen

- MIGRATION-2 erfolgreich abgeschlossen
- SaaS skaliert mit Tenant-Anzahl
- Budget fuer Gesamt-Rollout genehmigt

## Abhaengigkeiten

- MIGRATION-2 -> Eingangsvoraussetzung
- Lessons Learned aus Pilot
- Infrastruktur-Skalierungsplan

## Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Mitarbeiterwiderstand bei spaeteren Kommunen | Hoch | Verzoegerung | Pilotkommune als Referenz |
| Skalierungsprobleme | Mittel | Performance-Degradation | Tests nach jeder 5. Migration |
| Legacy-Kosten laufen laenger | Mittel | Budgetueberschreitung | Klare Dekommissionierungs-Kriterien |

## Onboarding-Reihenfolge

| Welle | Kommunen | Zeitrahmen |
|---|---|---|
| Pilot | 1 (MIGRATION-2) | Abgeschlossen |
| Early Adopter | 2-3 | 4-8 Wochen nach Pilot |
| Masse Welle 1 | 3-5 | 8-12 Wochen danach |
| Masse Welle 2 | Verbleibende | Fortlaufend |
| Sonder | Spezielle Anforderungen | Individuell |

## Dekommissionierungs-Checkliste

- [ ] Alle Kommunen >= 6 Wochen stabil auf SaaS
- [ ] Kein Legacy-Traffic seit >= 4 Wochen
- [ ] Datensicherung erstellt und getestet
- [ ] Archiv-Zugang eingerichtet
- [ ] Technische Dokumentation archiviert
- [ ] PO + PM haben schriftlich freigegeben
- [ ] Legacy-Infrastrukturkosten eingestellt
