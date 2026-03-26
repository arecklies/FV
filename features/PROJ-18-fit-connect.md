# PROJ-18: FIT-Connect-Anbindung (OZG-Portal)

**Status:** Planned | **Phase:** 3 (Fuehrung und Optimierung) | **Erstellt:** 2026-03-26
**Herkunft:** Abgespalten von PROJ-11 (Kundenfeedback: Bestandskunden haben kein FIT-Connect, XTA ist Pflicht fuer Phase 2)

---

## 1. Ziel / Problem

FIT-Connect ist der strategische OZG-Transportstandard fuer neue Fachverfahren und loeangerfristig der Nachfolger von XTA/OSCI. Sobald Bestandskunden FIT-Connect ueber ihre Serviceportale nutzen koennen, wird XTA (PROJ-11) schrittweise abgeloest.

## 2. Fachlicher Kontext & Stakeholder

- **P4 (Amtsleiter):** OZG-Konformitaet als strategisches Argument
- **P1 (Sachbearbeiter):** Automatischer Nachrichtenaustausch ohne manuellen Upload
- **Kundenfeedback 2026-03-26:** Bestandskunden haben aktuell kein FIT-Connect — XTA ist einziger aktiver Transportweg

## 3. Funktionale Anforderungen

- FA-1: FIT-Connect REST-API-Anbindung (Submission API + Retrieval API)
- FA-2: OAuth2-Authentifizierung gegen FIT-Connect
- FA-3: XBau-Nachrichten ueber FIT-Connect senden (Export)
- FA-4: XBau-Nachrichten ueber FIT-Connect empfangen (Import)
- FA-5: Parallelbetrieb XTA + FIT-Connect waehrend Uebergangsphase
- FA-6: Tenant-konfigurierbar: XTA, FIT-Connect, oder manuell

## 4. User Stories & Akzeptanzkriterien

### US-1: XBau-Nachrichten ueber FIT-Connect empfangen
Als Sachbearbeiter moechte ich eingehende Bauantraege automatisch ueber FIT-Connect empfangen.
- AC-1: Polling oder Webhook fuer eingehende Submissions
- AC-2: Eingehende XBau-XML wird automatisch geparst und als Vorgang angelegt (wie PROJ-7 Import)
- AC-3: Fehlermeldung bei ungueltigem XML

### US-2: XBau-Nachrichten ueber FIT-Connect senden
Als System moechte ich Bescheide und Statistiken automatisch ueber FIT-Connect versenden.
- AC-1: Ausgehende XBau-XML wird als FIT-Connect Submission erstellt
- AC-2: Zustellbestaetigung wird im Vorgang protokolliert

## 5. Nicht-funktionale Anforderungen

- NFR-1: Parallelbetrieb XTA + FIT-Connect ohne Datenverlust
- NFR-2: Tenant-Konfiguration: Transportweg pro Mandant waehlbar

## 6. Spezialisten-Trigger

- **Backend Developer:** FIT-Connect API-Integration, OAuth2
- **Security Engineer:** Zertifikatsmanagement, Verschluesselung
- **DevOps:** Webhook/Polling-Infrastruktur

## 7. Offene Fragen

1. Ab wann haben Bestandskunden FIT-Connect ueber ihre Serviceportale?
2. XTA-Sunset-Datum: Wann kann XTA abgeschaltet werden?

## 8. Annahmen

- FIT-Connect-Anbindung erst relevant wenn Bestandskunden FIT-Connect nutzen koennen
- XTA (PROJ-11) bleibt aktiv bis alle Kunden auf FIT-Connect migriert sind

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-7 (XBau-Basisschnittstelle) | XBau-Parsing und -Generierung |
| PROJ-11 (XTA-Anbindung) | Parallelbetrieb waehrend Uebergang |

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Bestandskunden bekommen FIT-Connect spaeter als erwartet | Hoch | XTA bleibt laenger aktiv | XTA-Sunset-Datum flexibel halten |
| FIT-Connect API-Aenderungen | Mittel | Nacharbeit | Versionierte Integration |

## 11. Scope / Nicht-Scope

**Scope:** FIT-Connect REST-API-Integration, Parallelbetrieb mit XTA, Tenant-Konfiguration
**Nicht-Scope:** XTA-Abschaltung (eigener Cutover-Prozess), FIT-Connect-Einrichtung auf Kundenseite
