# PROJ-5: Dokumentenverwaltung mit Versionierung

**Status:** In Progress | **Phase:** 1 (Kern-MVP) | **Erstellt:** 2026-03-25
**Letzte Verfeinerung:** 2026-03-29 (req-stories: 3 US verfeinert, MVP-Split, Follow-Ups PROJ-63/64 vorgeschlagen)

---

## 1. Ziel / Problem

Bauaufsicht arbeitet dokumentenintensiv: Plaene (bis 500MB), Gutachten, Bescheide, Schriftverkehr. Die digitale Akte muss Papier vollstaendig ersetzen. Versionierung ist Pflicht (Plan Rev. 2 ersetzt Rev. 1).

## 2. Fachlicher Kontext & Stakeholder

- **P1:** Strukturierte Ablage, Versionierung, max 500MB Upload, OCR-Volltextsuche
- **P2:** Drag-and-Drop Upload, einfach und schnell
- **P3:** Revisionssichere Ablage, Zustellnachweise
- **ADR-009:** Dokumenten-Storage und Upload-Strategie (Supabase Storage, Signed URLs, tus-Protokoll)
- **ADR-008:** OCR-Indexierung als Background Job (Edge Function, Level 2)

## 3. Funktionale Anforderungen

- FA-1: Strukturierte Ablage pro Vorgang (Kategorien: Antragsunterlagen, Plaene, Gutachten, Bescheide, Schriftverkehr)
- FA-2: Drag-and-Drop Upload
- FA-3: Resumable Upload fuer grosse Dateien (tus-Protokoll, ADR-009)
- FA-4: Unterstuetzte Formate: PDF, DWG, DXF, TIFF, JPEG, XLS/XLSX, DOCX
- FA-5: Versionierung (neue Version ersetzt alte, alte bleibt zugreifbar)
- FA-6: PDF-Vorschau im Browser (ohne Download)
- FA-7: Digitaler Posteingangsstempel (Zeitstempel bei Upload)
- FA-8: Volltextsuche ueber Dokumentenbestand -- **SHOULD HAVE im MVP** (OCR-Indexierung asynchron via ADR-008). MUST HAVE: Suche ueber Dateiname und manuelle Verschlagwortung.

## 4. User Stories & Akzeptanzkriterien

### MVP-Scope-Pruefung
3 Stories im MVP. PDF-Vorschau (PROJ-63) und OCR-Volltextsuche (PROJ-64) als Follow-Up-Items ausgelagert.

### US-1: Dokument hochladen und kategorisieren
**Als** Sachbearbeiter **moechte ich** Dokumente per Drag-and-Drop oder Dateiauswahl an einen Vorgang anhaengen, **damit** die digitale Akte vollstaendig gefuehrt wird.
- AC-1: Reiter "Dokumente" auf Vorgangsdetailseite mit Drop-Zone und "Datei auswaehlen"-Button
- AC-2: Upload unterstuetzt PDF, DWG, DXF, TIFF, JPEG, XLS/XLSX, DOCX. Andere Formate serverseitig abgelehnt (Content-Type-Validierung)
- AC-3: Dateien bis 500 MB ohne Timeout (Direct Upload via Signed URL, tus fuer > 50 MB)
- AC-4: Fortschrittsbalken mit Prozentanzeige waehrend Upload
- AC-5: Automatischer Posteingangsstempel (`uploaded_at` UTC) in DB und Dokumentenliste
- AC-6: Kategorie-Auswahl beim Upload: Antragsunterlagen, Plaene, Gutachten, Bescheide, Schriftverkehr, Sonstiges (Default: Sonstiges)
- AC-7: Optionale Schlagwoerter (Freitext-Tags) und Beschreibung
- AC-8: Dokument erscheint sofort in Dokumentenliste (sortiert nach Upload-Datum, neueste zuerst)
- AC-9: Dokumentenliste zeigt: Dateiname, Kategorie, Version, Dateigroesse, Upload-Datum, hochgeladen von
- AC-10: Batch-Upload (mehrere Dateien gleichzeitig per Drag-and-Drop)
- AC-11: Loading-, Error- und Empty-States
- AC-12: Bei Netzwerkabbruch: Fehlermeldung, kein halb-gespeichertes Dokument

### US-2: Neue Dokumentversion hochladen
**Als** Sachbearbeiter **moechte ich** eine neue Version eines bestehenden Dokuments hochladen, **damit** die Versionshistorie lueckenlos nachvollziehbar ist.
- AC-1: Aktion "Neue Version hochladen" bei jedem Dokument
- AC-2: Neue Version wird Standard-Anzeige (mit Versionsnummer z.B. "v3")
- AC-3: Versionshistorie: alle frueheren Versionen zugreifbar (Nummer, Datum, Benutzer, Groesse)
- AC-4: Aeltere Versionen downloadbar aber nicht loeschbar (Revisionssicherheit)
- AC-5: Storage-Struktur: `{tenant_id}/{vorgang_id}/{dokument_id}/v{n}/original.{ext}` (ADR-009)
- AC-6: Gleiche Content-Type-Validierung wie Erstupload
- AC-7: Metadaten (Kategorie, Schlagwoerter) je Version aenderbar

### US-3: Dokument nach Metadaten suchen und filtern
**Als** Sachbearbeiter **moechte ich** Dokumente ueber Dateiname, Kategorie und Schlagwoerter finden.
- AC-1: Suchfeld im Dokumenten-Bereich (Substring, case-insensitive ueber Dateiname, Beschreibung, Schlagwoerter)
- AC-2: Kategorie-Filter (Dropdown/Chips)
- AC-3: Suche und Filter kombinierbar (UND)
- AC-4: Ergebnisse < 1 Sekunde (clientseitig bei < 200 Dokumenten, serverseitig bei >= 200)
- AC-5: Empty-State mit Suchterm bei leerem Ergebnis
- AC-6: Download-Button je Dokument (zeitlich begrenzte Signed URL, max 60 Min)

## 5. Nicht-funktionale Anforderungen

- NFR-1: Upload bis 500MB ohne Abbruch (Resumable Upload via tus, ADR-009)
- NFR-2: Dokumentenvorschau < 3s fuer Dateien bis 10MB
- NFR-3: Automatisches Zwischenspeichern bei Formulareingaben (kein Datenverlust bei Verbindungsabbruch)
- NFR-4: Mandantentrennung auf Dokument-Ebene (RLS + Storage Policies, ADR-009)

## 6. Spezialisten-Trigger

- **Database Architect:** Schema `vorgang_dokumente` + `vorgang_dokument_versionen`, RLS, Volltext-Index
- **Security Engineer:** Storage Policies, Content-Type-Validierung, Signed URLs, Malware-Scan-Strategie
- **Software Architect:** PROJ-2 Abhaengigkeit klaeren (Tenant-Isolation fuer Storage ohne Multi-Tenancy)
- **Backend Developer:** DokumentenService, Upload-API (Signed URLs), Metadaten-CRUD
- **Frontend Developer:** DropZone-Komponente, Dokumentenliste, Versionshistorie
- **DevOps Engineer:** Supabase Storage Bucket "dokumente" anlegen, tus-Aktivierung

## 7. Offene Fragen

1. **[Architekt, Blocker]** PROJ-2 ist "Planned". Storage Policies brauchen `tenant_id` im JWT. MVP-Loesung?
2. **[Security]** Content-Type-Validierung oder Magic-Byte-Pruefung? Malware-Scan-Strategie?
3. **[Database]** Separate `vorgang_dokument_versionen`-Tabelle oder Versionsnummer in Haupttabelle?
4. ~~OCR-Dienst~~ -- Nicht-Scope MVP (Follow-Up PROJ-64)
5. ~~DWG/DXF-Vorschau~~ -- Nur Download (bestaetigt)
6. **[DevOps]** Supabase Free-Plan: Upload-Limit 50 MB. Wann Pro-Plan?

## 8. Annahmen

- Supabase Storage fuer MVP (ADR-009), separater Storage fuer Produktion evaluieren
- OCR ist Nicht-Scope MVP (Follow-Up PROJ-64)
- DWG/DXF werden nicht im Browser angezeigt (nur Download)
- Alle Benutzer des Mandanten sehen alle Dokumente (einfachste RLS). Feingranulare Berechtigungen zurueckgestellt.
- 6 feste Kategorien (nicht mandanten-konfigurierbar im MVP)
- PROJ-2 (Mandanten-Schema) wird vor oder parallel umgesetzt, oder Architekt definiert MVP-Workaround

## 11. Scope / Nicht-Scope

**Scope:** Upload (Drag-and-Drop, Batch, Signed URLs), Kategorisierung (6 Kategorien), Verschlagwortung, Posteingangsstempel, Versionierung, Metadaten-Suche, Download via Signed URLs, Storage Policies, DB-Schema
**Nicht-Scope:** PDF-Vorschau (PROJ-63), OCR-Volltextsuche (PROJ-64), DWG/DXF-Vorschau, feingranulare Zugriffssteuerung, Malware-Scan (Security klaert), Thumbnail-Generierung, Legacy-Import (MIGRATION-1/2), Massendownload (ZIP)

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-3 (Vorgangsverwaltung) | Dokumente gehoeren zu Vorgaengen |
| PROJ-2 (RLS) | Mandantentrennung auf Dokumenten |
| ADR-003 (Service-Architektur) | DokumentenService |
| ADR-009 (Dokumenten-Storage) | Upload-Flow, Signed URLs, Storage Policies |
| ADR-008 (Background Jobs) | OCR-Indexierung als Edge Function (SHOULD HAVE) |

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| 500MB-Upload bricht ab | Mittel | Nutzerfrust | Resumable Upload (tus-Protokoll, ADR-009) |
| OCR-Qualitaet schlecht bei Scans | Mittel | Suche findet nichts | OCR-Qualitaetsanzeige, manuelle Verschlagwortung als Fallback |
| Storage-Kosten steigen schnell | Mittel | Budgetrisiko | Speicher-Monitoring pro Tenant, Komprimierung |
