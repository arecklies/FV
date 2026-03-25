# PROJ-8: Vollstaendiger Datenexport

**Status:** Planned | **Phase:** 1 (Kern-MVP) | **Erstellt:** 2026-03-25

---

## 1. Ziel / Problem

Vollstaendiger Datenexport ist K.O.-Kriterium Nr. 2. Der Amtsleiter (P4) braucht die Garantie: "Wir koennen jederzeit weg." Kein Vendor-Lock-in. Der Export muss ohne Anbieter-Kontakt durchfuehrbar sein.

## 2. Fachlicher Kontext & Stakeholder

- **P4:** "Vollstaendiger Export aller eigenen Daten in maschinenlesbarem Format -- keine Vendor-Lock-in-Falle"
- **P3:** Datenexport fuer Widerspruchsverfahren und Aktenvorlage
- **P1:** Testmigration und Vollstaendigkeitsprotokoll

## 3. Funktionale Anforderungen

- FA-1: Export aller Vorgaenge eines Mandanten als JSON oder XML
- FA-2: Export aller Dokumente als Dateien (PDF, Plaene) mit Metadaten
- FA-3: Export aller Stammdaten (Beteiligte, Grundstuecke)
- FA-4: Export aller Konfigurationsdaten (Textbausteine, Verfahrensarten, Fristen)
- FA-5: Export ohne Anbieter-Kontakt ausfuehrbar (Self-Service)
- FA-6: Export als ZIP-Archiv mit Verzeichnisstruktur
- FA-7: Vollstaendigkeitsprotokoll (Anzahl Vorgaenge, Dokumente, Stammdaten)

## 4. User Stories & Akzeptanzkriterien

### US-1: Mandanten-Export
Als Amtsleiter moechte ich jederzeit alle Daten meiner Behoerde exportieren.
- AC-1: Export-Button im Admin-Bereich (nur Admin-Rolle)
- AC-2: Export umfasst: Vorgaenge, Dokumente, Stammdaten, Konfiguration
- AC-3: Format: JSON fuer Strukturdaten, Original-Dateien fuer Dokumente
- AC-4: ZIP-Archiv mit dokumentierter Verzeichnisstruktur
- AC-5: Vollstaendigkeitsprotokoll als CSV (Entitaet, Anzahl exportiert, Anzahl in DB)

### US-2: Export-Performance
Als Admin moechte ich den Export in akzeptabler Zeit abschliessen.
- AC-1: Export von 10.000 Vorgaengen in < 4 Stunden
- AC-2: Fortschrittsanzeige waehrend Export
- AC-3: Export laeuft asynchron (Queue-basiert), Benachrichtigung bei Fertigstellung

## 5. Nicht-funktionale Anforderungen

- NFR-1: Export nur fuer eigenen Tenant (RLS-konform)
- NFR-2: Kein Cross-Tenant-Daten im Export (Security-Test)
- NFR-3: Export-Dateien enthalten keine internen IDs anderer Tenants
- NFR-4: Asynchrone Verarbeitung (nicht synchron in API-Route - Vercel 55s Limit)

## 6. Spezialisten-Trigger

- **Backend Developer:** ExportService, asynchrone Verarbeitung, ZIP-Erzeugung
- **Security Engineer:** Tenant-Isolation im Export, keine Cross-Tenant-Daten
- **QS Engineer:** Vollstaendigkeitstest (Export == DB-Bestand)

## 7. Offene Fragen

1. Export-Format: Eigenes Schema oder standardisiertes Format (XBau fuer Vorgaenge)?
2. Dokumenten-Export: Original-Dateien oder nur Metadaten?
3. Wie wird der asynchrone Export technisch umgesetzt (Supabase pg_cron, Background Worker)?

## 8. Annahmen

- Export laeuft asynchron (Queue/Job), nicht synchron
- ZIP-Erzeugung serverseitig
- Original-Dokumente werden als Dateien exportiert (nicht Base64 in JSON)

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-2 (RLS) | Export nur eigener Tenant |
| PROJ-3 (Vorgangsverwaltung) | Vorgaenge exportieren |
| PROJ-5 (Dokumentenverwaltung) | Dokumente exportieren |
| ADR-003 (Service-Architektur) | ExportService, asynchron |

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Export unvollstaendig | Mittel | Vertrauensverlust, K.O.-Kriterium verletzt | Vollstaendigkeitsprotokoll, automatisierte Tests |
| Cross-Tenant-Daten im Export | Niedrig | Kritisch (Datenschutz) | RLS-basierter Export, Security-Test |
| Export bei grossen Tenants zu langsam | Mittel | Timeout, Abbruch | Asynchrone Verarbeitung, Chunking |
| ZIP-Datei zu gross fuer Download | Niedrig | UX-Problem | Split in mehrere ZIPs, Streaming-Download |
