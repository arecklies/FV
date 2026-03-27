# PROJ-44: LBO Baden-Württemberg Regelwerk-Konfiguration

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-28
**Herkunft:** Kunden-Session 28.03.2026, F-03 (Herr Yilmaz, Freiburg, P1)
**Prioritaet:** Hoch (Pilotblocker Freiburg)

---

## 1. Ziel / Problem

Freiburg (Baden-Württemberg) ist der erste Nicht-NRW-Pilotkandidat. Die LBO BW definiert andere Verfahrenstypen als NRW — insbesondere das Kenntnisgabeverfahren nach § 51 LBO BW. Ohne LBO-BW-Konfiguration kann Freiburg das System nicht nutzen. Die Architektur (ADR-006 Regelwerk-Engine) ist auf Multi-BL ausgelegt, die konkreten BW-Daten fehlen.

## 2. Fachlicher Kontext & Stakeholder

- **P1 (Erfahrener SB, Freiburg):** "Wir haben das Kenntnisgabeverfahren nach § 51 — das gibt es bei NRW nicht"
- **P4 (Amtsleiterin, Freiburg):** Erster Multi-BL-Beweis strategisch wichtig
- **ADR-006:** Rechtskonfiguration als Daten (Regelwerk-Engine)
- **PRD:** "Alle 16 LBOs architektonisch unterstützen"

## 3. Funktionale Anforderungen

- FA-1: Verfahrensarten BW in `config_verfahrensarten` konfigurieren (Kenntnisgabeverfahren, Baugenehmigung, Bauvorbescheid etc.)
- FA-2: Gesetzliche Fristen BW in `config_fristen` konfigurieren
- FA-3: Gebäudeklassen und Schwellenwerte BW in Regelwerk-Dateien
- FA-4: Feiertage BW in `config_feiertage`
- FA-5: Workflow-Definitionen BW in `config_workflows`

## 4. User Stories & Akzeptanzkriterien

### US-1: Vorgang mit BW-Verfahrensart anlegen
Als Sachbearbeiter in Freiburg möchte ich einen Vorgang mit Verfahrensart "Kenntnisgabeverfahren" anlegen.
- AC-1: Bei Bundesland "BW" werden BW-spezifische Verfahrensarten angezeigt
- AC-2: Kenntnisgabeverfahren (§ 51 LBO BW) ist verfügbar
- AC-3: Fristen werden nach LBO BW berechnet
- AC-4: Feiertage BW werden bei Fristberechnung berücksichtigt

## 6. Spezialisten-Trigger

- **Regelwerk/Backend:** PDF-Extraktion LBO BW unter `Input/Gesetze/LBOs/`
- **Database Architect:** Seed-Daten für config_verfahrensarten, config_fristen, config_feiertage
- **Senior QS Engineer:** Verifikation gegen LBO-BW-Quelldokument

## 9. Abhaengigkeiten

- ADR-006 (Rechtskonfiguration als Daten)
- PROJ-3 (Vorgangsverwaltung): Verfahrensart-Auswahl
- PROJ-4 (Fristmanagement): Fristberechnung je BL

## 11. Scope / Nicht-Scope

**Scope:** Verfahrensarten, Fristen, Feiertage, Workflows für BW
**Nicht-Scope:** service-bw-Schnittstelle (eigenes Item PROJ-45), Gebührenberechnung BW (Phase 3)
