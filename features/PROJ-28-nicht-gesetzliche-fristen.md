# PROJ-28: Nicht-gesetzliche Fristen (interne Bearbeitungsfristen)

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-26
**Herkunft:** Kundentermin 26.03.2026, Feedback F-05 (mittlere Kreisbaubehoerde)

---

## 1. Ziel / Problem

Behoerden setzen eigene Qualitaetsziele (z.B. "Bescheid innerhalb von 6 Wochen", "Beteiligung innerhalb 10 Werktagen"), die ueber die gesetzlichen Mindestfristen hinausgehen. Aktuell koennen nur gesetzliche Fristen aus `config_fristen` automatisch gesetzt werden. Manuelle/interne Fristen fehlen. Das wurde von der mittleren Kreisbaubehoerde als konkreter Bedarf benannt.

## 2. Fachlicher Kontext & Stakeholder

- **P1 (Erfahrener SB):** Setzt sich selbst interne Bearbeitungsziele, will diese tracken
- **P3 (Referatsleiter):** Definiert Qualitaetsziele fuer das Referat (z.B. "90% der Bescheide innerhalb 8 Wochen")
- **Mittlere Behoerde (Kundentermin):** "Wir brauchen die Moeglichkeit, auch nicht-gesetzliche Fristen zu setzen"
- **ADR-003:** FristService unter `src/lib/services/fristen/` — gleiche Infrastruktur nutzbar
- **ADR-006:** Interne Fristen sind NICHT in `config_fristen` (keine Landesrecht-Konfiguration), sondern manuell

## 3. Funktionale Anforderungen

- FA-1: Sachbearbeiter kann manuell eine Frist fuer einen Vorgang anlegen (Typ: "intern")
- FA-2: Fristtyp "intern" nutzt dieselbe Ampellogik wie gesetzliche Fristen
- FA-3: Interne Fristen werden in der Fristen-Uebersicht visuell von gesetzlichen unterschieden (z.B. Badge "Intern")
- FA-4: Interne Fristen sind optional — kein Vorgang muss eine haben

## 4. User Stories & Akzeptanzkriterien

### US-1: Interne Frist manuell anlegen
Als Sachbearbeiter moechte ich eine eigene Bearbeitungsfrist fuer einen Vorgang setzen.
- AC-1: Im Fristen-Tab kann eine neue Frist mit Typ "intern" angelegt werden
- AC-2: Pflichtfelder: Bezeichnung, Werktage, Startdatum
- AC-3: Ampellogik und Audit-Trail funktionieren identisch zu gesetzlichen Fristen
- AC-4: Verlaengerung und Hemmung sind auch fuer interne Fristen moeglich

## 5. Nicht-funktionale Anforderungen

- NFR-1: Kein Unterschied in Performance zu gesetzlichen Fristen
- NFR-2: Interne Fristen duerfen gesetzliche Fristen nicht verdecken oder ueberlagern (Darstellungsreihenfolge: gesetzlich zuerst)

## 6. Spezialisten-Trigger

- **Senior Backend Developer:** CreateFrist um Typ "intern" erweitern
- **Senior Frontend Developer:** Fristen-Panel um "Interne Frist anlegen"-Button erweitern

## 7. Offene Fragen

Keine.

## 8. Annahmen

- Das bestehende `vorgang_fristen`-Datenmodell kann interne Fristen ohne Schemaaenderung speichern (Feld `typ` ist text, nicht enum)
- Interne Fristen werden NICHT im Cron-Job fuer Erinnerungen beruecksichtigt (nur gesetzliche)

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-4 (Fristmanagement) | Voraussetzung (FristService, vorgang_fristen, UI) |

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Nutzer verwechseln interne mit gesetzlichen Fristen | Niedrig | Fehleinschaetzung Dringlichkeit | Visuelles Badge "Intern" + Sortierung gesetzlich zuerst |

## 11. Scope / Nicht-Scope

**Scope:** Manuelle Fristanlage mit Typ "intern", gleiche Ampellogik, Badge zur Unterscheidung
**Nicht-Scope:** Vorlagen fuer interne Fristen (konfigurierbar pro Behoerde), Statistik ueber Einhaltung interner Fristen
