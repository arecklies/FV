# PROJ-34: Konfigurierbare Ampel-Schwellenwerte

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-27
**Herkunft:** Zoom-Demo 27.03.2026, Dortmund-Feedback

---

## 1. Ziel / Problem

Die Frist-Ampel verwendet feste Schwellenwerte (gruen > 50%, gelb 25-50%, rot < 25%). Bei kurzen Fristen (5 Werktage) ist "gelb bei 25%" nur 1,25 Tage — zu spaet fuer eine sinnvolle Reaktion. Behoerden brauchen konfigurierbare Schwellenwerte.

## 2. Fachlicher Kontext & Stakeholder

- **P1 (Sachbearbeiter):** Sieht Ampelfarben in Vorgangsliste
- **P3 (Referatsleiter):** Definiert Eskalationsregeln
- **Dortmund:** Konkreter Wunsch: gelb ab 60%, rot ab 30%

## 3. Funktionale Anforderungen

- FA-1: `config_fristen` um optionale Spalten `gelb_ab` und `rot_ab` (Prozent Restzeit) erweitern
- FA-2: Fallback auf Standard 50/25 bei NULL
- FA-3: Ampel-Berechnung verwendet konfigurierte Werte

## 4. User Stories & Akzeptanzkriterien

### US-1: Ampel-Schwellenwerte konfigurieren
Als Referatsleiter moechte ich die Schwellenwerte fuer die Frist-Ampel anpassen.
- AC-1: `config_fristen` hat optionale Spalten `gelb_ab` und `rot_ab` (INTEGER, 1-99)
- AC-2: `gelb_ab` muss groesser als `rot_ab` sein (Validierung)
- AC-3: Bei NULL gelten Standardwerte 50/25
- AC-4: Aenderungen wirken sofort auf alle Ansichten

## 5. Nicht-funktionale Anforderungen

- NFR-1: Ampel-Berechnung wird nicht messbar langsamer (Config pro Session laden)

## 6. Spezialisten-Trigger

- **Database Architect:** Schema-Erweiterung config_fristen

## 7. Offene Fragen

Keine — Schwellenwerte gelten global pro Behoerde (nicht pro Fristtyp).

## 8. Annahmen

- Bestehende Ampel-Logik ist zentral in `werktage.ts` implementiert und einfach erweiterbar

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-4 (Fristmanagement) | Voraussetzung (config_fristen, Ampel-Logik) |

## 10. Fachliche Risiken

Keine — nicht-destruktive DB-Erweiterung (ADD COLUMN, nullable).

## 11. Scope / Nicht-Scope

**Scope:** Schema-Erweiterung, Fallback-Logik, Ampel-Berechnung
**Nicht-Scope:** Schwellenwerte pro Fristtyp, zusaetzliche Ampelfarben, Admin-UI (separate Aufgabe)
