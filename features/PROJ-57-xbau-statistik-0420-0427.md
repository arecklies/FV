# PROJ-57: XBau Statistik-Nachrichten 0420-0427

**Status:** Planned | **Phase:** 1 (Kern-MVP) | **Erstellt:** 2026-03-27
**Herkunft:** Follow-up aus PROJ-7 Conditional Go (US-3)

---

## 1. Ziel / Problem

PROJ-7 US-3 fordert die Generierung aller 8 XBau-Statistik-Nachrichten (0420-0427). Diese sind Teil der OZG-Konformitaet und K.O.-Kriterium. Die Implementierung wurde aus dem PROJ-7 MVP ausgelagert.

## 2. Fachlicher Kontext & Stakeholder

- **OZG-Konformitaet:** Statistiknachrichten sind Pflicht
- **Nachrichtentypen:** 0420 Daten Bauvorhaben, 0421 Baugenehmigung, 0422 Abbruchgenehmigung, 0423 Bautaetigkeitsstatistik Hochbau, 0424 Bautaetigkeitsstatistik Tiefbau, 0425 Baufertigstellung, 0426 Bauueberhang, 0427 Wohnungsbestand

## 3. Funktionale Anforderungen

- FA-1: Generierung aller 8 Statistik-Nachrichtentypen (0420-0427)
- FA-2: Codelisten-Attribute exakt aus XSD (listURI, listVersionID)
- FA-3: Alle Nachrichten XSD-valide
- FA-4: Namespace-Qualifizierung korrekt
- FA-5: Codelisten-Mapping ueber config_xbau_codelisten-Tabelle

## 4. User Stories & Akzeptanzkriterien

### US-1: Statistik-Nachrichten generieren
Uebernahme von PROJ-7 US-3 (AC-1 bis AC-7).
- AC-1: Jede Nachricht enthaelt alle Pflichtfelder laut XSD
- AC-2: Codelisten-Attribute exakt aus xbau-codes.xsd
- AC-3: Alle Nachrichten sind XSD-valide
- AC-4: Namespace-Qualifizierung korrekt
- AC-5: Jeder Nachrichtentyp hat mindestens einen Unit-Test gegen Referenz-XML
- AC-6: Codelisten-Mapping nutzt config_xbau_codelisten-Tabelle
- AC-7: Generierte Nachrichten werden in xbau_nachrichten gespeichert

## 5. Nicht-funktionale Anforderungen

- Ausgabe von `/req-nfr` wird hier eingefuegt.

## 6. Spezialisten-Trigger

- **Senior Backend Developer:** XML-Builder fuer 8 Nachrichtentypen
- **Senior QS Engineer:** Referenz-XML-Vergleich, Unit-Tests

## 7. Offene Fragen

- Keine (aus PROJ-7 uebernommen).

## 8. Annahmen

- XBau-Service-Infrastruktur (xbau-service/) ist aus PROJ-7 vorhanden
- Codelisten-Tabelle existiert

## 9. Abhaengigkeiten

- PROJ-7 (XBau-Basisschnittstelle) -- Deployed (Conditional)

## 10. Fachliche Risiken

| Risiko | Auswirkung | Gegenmassnahme |
|--------|-----------|----------------|
| Codelisten-Aenderung durch XBau-Update | Nachrichten ungueltig | Versionierung in Mapping-Tabelle |

## 11. Scope / Nicht-Scope

**Scope:** 8 Statistik-Nachrichtentypen (0420-0427)
**Nicht-Scope:** Automatischer Versand (XTA/FIT-Connect), Scheduling
