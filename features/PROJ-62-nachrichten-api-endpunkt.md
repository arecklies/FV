# PROJ-62: Nachrichten-API-Endpunkt (Transportprotokoll)

**Status:** Planned | **Phase:** 1 (Kern-MVP) | **Erstellt:** 2026-03-29
**Herkunft:** Fehlender API-Endpunkt fuer PROJ-7 Transportprotokoll-Tab
**Prioritaet:** Hoch (sichtbarer Fehler im UI: "Nachrichten konnten nicht geladen werden")

---

## 1. Ziel / Problem

Der Nachrichten-Tab auf der Vorgangsdetailseite ruft `GET /api/vorgaenge/[id]/nachrichten` auf, aber dieser Endpunkt existiert nicht. Das Frontend wurde in PROJ-7 implementiert, das Backend fehlt. Ergebnis: roter Fehlertext "Nachrichten konnten nicht geladen werden" auf jedem Vorgang.

## 2. Fachlicher Kontext & Stakeholder

- **PROJ-7 US-1c:** Transportprotokoll einsehen (AC-1 bis AC-7)
- **Tabelle:** `xbau_nachrichten` (Service-Only, deny-all RLS)

## 3. Funktionale Anforderungen

- FA-1: `GET /api/vorgaenge/[id]/nachrichten` -- Liste aller XBau-Nachrichten zum Vorgang
- FA-2: Sortierung chronologisch (neueste zuerst)
- FA-3: Rueckgabe: nachrichtentyp, richtung, zeitpunkt, verarbeitungsstatus

## 4. User Stories & Akzeptanzkriterien

### US-1: Nachrichten-Endpunkt
- AC-1: GET-Endpunkt gibt `{ nachrichten: [...] }` zurueck
- AC-2: Auth-Check (requireAuth)
- AC-3: Tenant-isoliert (nur Nachrichten des eigenen Tenants)
- AC-4: Leere Liste wenn keine Nachrichten vorhanden (kein Fehler)
- AC-5: UUID-Validierung auf Path-Parameter [id]

## 9. Abhaengigkeiten

- PROJ-7 (XBau-Basisschnittstelle) -- Frontend bereits implementiert
- Tabelle `xbau_nachrichten` muss in Supabase existieren

## 11. Scope / Nicht-Scope

**Scope:** API-Endpunkt, Service-Funktion, leere Liste bei fehlender Tabelle
**Nicht-Scope:** XBau-Nachrichtenversand, Upload-UI
