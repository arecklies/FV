# PROJ-36: Aktenzeichen-Feld auf Vorgang

**Status:** Deployed | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-27
**Herkunft:** Kunden-Session 27.03.2026, F-02 (Herr Brandt, Soest, P1)
**Prioritaet:** ~~Pilotblocker Soest~~ → Bereits implementiert

---

## Ergebnis der Anforderungsanalyse

**PROJ-36 ist bereits durch PROJ-3 (Vorgangsverwaltung) abgedeckt:**

| Anforderung | Status | Implementierung |
|---|---|---|
| Feld `aktenzeichen` auf Vorgang | Vorhanden | `vorgaenge.aktenzeichen text NOT NULL` (Migration PROJ-3) |
| Auto-Generierung | Vorhanden | `src/lib/services/verfahren/aktenzeichen.ts` (Schema: `{jahr}/{laufnummer}/{kuerzel}`) |
| Pro-Tenant konfigurierbar | Vorhanden | `tenants.settings.aktenzeichen_schema` |
| Anzeige in Vorgangsliste | Vorhanden | `src/app/vorgaenge/page.tsx` (Spalte, sortierbar) |
| Suche nach Aktenzeichen | Vorhanden | Volltextsuche ueber `aktenzeichen` (Index `idx_vorgaenge_aktenzeichen`) |
| UNIQUE-Constraint | Vorhanden | `UNIQUE(tenant_id, aktenzeichen)` |

**Empfehlung:** PROJ-36 schliessen. Dem Kunden in der naechsten Session die bestehende Aktenzeichen-Funktion demonstrieren. Falls Soest ein anderes Aktenzeichen-Format braucht, ist das ueber `tenants.settings.aktenzeichen_schema` konfigurierbar.

## Offene Frage fuer naechste Session

- Meint Herr Brandt ein **zusaetzliches manuelles Aktenzeichen** (neben dem automatischen)? Falls ja, waere das ein eigenes Item.
