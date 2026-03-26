# PROJ-21: Frist-Dashboard Sachbearbeiter-Gruppierung

**Status:** In Progress | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-26
**Herkunft:** PROJ-4 US-3 AC-2 (QS-Review: als separates Item ausgelagert)

---

## 1. Ziel / Problem

Der Endpunkt GET /api/fristen/gefaehrdet liefert gefaehrdete Fristen als flache Liste. Referatsleiter benoetigen eine Gruppierung nach zustaendigem Sachbearbeiter, um gezielt intervenieren zu koennen. Der Query-Parameter `gruppiert_nach` existiert bereits, wird aber im Service ignoriert.

## 2. Fachlicher Kontext & Stakeholder

- **P3 (Referatsleiter):** "Ich will sehen, bei welchem Sachbearbeiter sich die fristgefaehrdeten Vorgaenge haeufen"
- **PROJ-4:** API-Parameter `gruppiert_nach` und `GefaehrdeteQuerySchema` existieren bereits

## 3. Funktionale Anforderungen

- FA-1: `listGefaehrdeteFristen` unterstuetzt den Parameter `gruppiert_nach: "sachbearbeiter"`
- FA-2: Response enthaelt gruppierte Daten mit Sachbearbeiter-ID als Key
- FA-3: Innerhalb jeder Gruppe: Sortierung nach Enddatum (dringendste zuerst)

## 4. User Stories & Akzeptanzkriterien

### US-1: Gruppierung nach Sachbearbeiter
Als Referatsleiter moechte ich gefaehrdete Fristen gruppiert nach zustaendigem Sachbearbeiter sehen.
- AC-1: GET /api/fristen/gefaehrdet?gruppiert_nach=sachbearbeiter liefert gruppierte Daten
- AC-2: Jede Gruppe enthaelt Sachbearbeiter-ID und die zugehoerigen gefaehrdeten Fristen. **Scope-Reduktion (QS-Review):** SB-Name-Lookup erfordert zusaetzlichen JOIN auf tenant_members/auth — wird als Enhancement nachgeliefert, da der Name im Frontend ueber den bereits geladenen User-Kontext aufgeloest werden kann.
- AC-3: Gruppen sind nach Anzahl gefaehrdeter Fristen absteigend sortiert (meiste zuerst)
- AC-4: Ohne `gruppiert_nach`-Parameter bleibt die Antwort unveraendert (Abwaertskompatibilitaet)
- AC-5: Leere Gruppen (Sachbearbeiter ohne gefaehrdete Fristen) werden NICHT zurueckgegeben

### US-2: Nur ueberschrittene Fristen im Referatsleiter-Dashboard
Als Referatsleiter moechte ich nur tatsaechlich ueberschrittene Fristen sehen (keine Alarm-Muedigkeit).
- AC-1: Neuer Query-Parameter `nur_ueberschritten=true` filtert auf Status `dunkelrot`
- AC-2: Ohne den Parameter: weiterhin gelb + rot + dunkelrot (Abwaertskompatibilitaet)
- AC-3: Kombinierbar mit `gruppiert_nach` (beide Parameter gleichzeitig)

## 5. Nicht-funktionale Anforderungen

- NFR-1: Abwaertskompatibel — bestehende Clients ohne `gruppiert_nach` erhalten flache Liste

## 6. Spezialisten-Trigger

- **Senior Backend Developer:** Service-Funktion erweitern

## 7. Offene Fragen

Keine.

## 8. Annahmen

- `zustaendiger_user_id` auf `vorgaenge` ist der Gruppierungsschluessel (bereits im JOIN enthalten)

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-4 (Fristmanagement) | Voraussetzung (listGefaehrdeteFristen, GefaehrdeteQuerySchema) |

## 10. Fachliche Risiken

Keine — geringes Aenderungsrisiko.

## 11. Scope / Nicht-Scope

**Scope:**
- Service-Logik fuer `gruppiert_nach=sachbearbeiter`
- Angepasstes Response-Format bei Gruppierung

**Nicht-Scope:**
- Frontend-Dashboard-Widget (eigenes Feature, ggf. PROJ-13)
- Gruppierung nach Status (kann spaeter ergaenzt werden)
