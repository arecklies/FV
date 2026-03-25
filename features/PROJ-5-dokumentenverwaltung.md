# PROJ-5: Dokumentenverwaltung mit Versionierung

**Status:** Planned | **Phase:** 1 (Kern-MVP) | **Erstellt:** 2026-03-25

---

## 1. Ziel / Problem

Bauaufsicht arbeitet dokumentenintensiv: Plaene (bis 500MB), Gutachten, Bescheide, Schriftverkehr. Die digitale Akte muss Papier vollstaendig ersetzen. Versionierung ist Pflicht (Plan Rev. 2 ersetzt Rev. 1).

## 2. Fachlicher Kontext & Stakeholder

- **P1:** Strukturierte Ablage, Versionierung, max 500MB Upload, OCR-Volltextsuche
- **P2:** Drag-and-Drop Upload, einfach und schnell
- **P3:** Revisionssichere Ablage, Zustellnachweise

## 3. Funktionale Anforderungen

- FA-1: Strukturierte Ablage pro Vorgang (Kategorien: Antragsunterlagen, Plaene, Gutachten, Bescheide, Schriftverkehr)
- FA-2: Drag-and-Drop Upload
- FA-3: Resumable Upload fuer grosse Dateien (tus-Protokoll oder Multipart)
- FA-4: Unterstuetzte Formate: PDF, DWG, DXF, TIFF, JPEG, XLS/XLSX, DOCX
- FA-5: Versionierung (neue Version ersetzt alte, alte bleibt zugreifbar)
- FA-6: PDF-Vorschau im Browser (ohne Download)
- FA-7: Digitaler Posteingangsstempel (Zeitstempel bei Upload)
- FA-8: Volltextsuche ueber Dokumentenbestand (OCR-Indexierung asynchron)

## 4. User Stories & Akzeptanzkriterien

### US-1: Drag-and-Drop Upload
Als Einsteiger moechte ich Dokumente per Drag-and-Drop hochladen.
- AC-1: Drop-Zone auf Vorgangsseite sichtbar
- AC-2: Upload bis 500MB ohne Timeout
- AC-3: Fortschrittsanzeige waehrend Upload
- AC-4: Automatische OCR-Indexierung nach Upload (asynchron)

### US-2: Dokumenten-Versionierung
Als Sachbearbeiter moechte ich eine neue Planversion hochladen, die die alte ersetzt.
- AC-1: "Neue Version" Aktion bei bestehendem Dokument
- AC-2: Alte Version bleibt zugreifbar (Versionshistorie)
- AC-3: Aktuelle Version ist Standard-Anzeige

### US-3: Dokument finden
Als Sachbearbeiter moechte ich ein Dokument ueber Volltextsuche finden.
- AC-1: Suche ueber Dateiname und OCR-extrahierten Text
- AC-2: Ergebnisse in < 3 Sekunden

## 5. Nicht-funktionale Anforderungen

- NFR-1: Upload bis 500MB ohne Abbruch (Resumable Upload)
- NFR-2: Dokumentenvorschau < 3s fuer Dateien bis 10MB
- NFR-3: Automatisches Zwischenspeichern bei Formulareingaben (kein Datenverlust bei Verbindungsabbruch)
- NFR-4: Mandantentrennung auf Dokument-Ebene (RLS)

## 6. Spezialisten-Trigger

- **Backend Developer:** DokumentenService, Upload-Handling, OCR-Integration
- **Database Architect:** Dokument-Schema, Versionierung, Volltext-Index
- **Frontend Developer:** Drop-Zone, Vorschau, Versionshistorie

## 7. Offene Fragen

1. OCR-Dienst: Tesseract lokal oder externer Service?
2. Storage: Supabase Storage oder separater S3-kompatibler Dienst?
3. DWG/DXF-Vorschau: Im Browser moeglich oder nur Download?

## 8. Annahmen

- Supabase Storage fuer MVP, separater Storage fuer Produktion evaluieren
- OCR laeuft asynchron (Queue/Background-Job)
- DWG/DXF werden nicht im Browser angezeigt (nur Download)

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ |
|---|---|
| PROJ-3 (Vorgangsverwaltung) | Dokumente gehoeren zu Vorgaengen |
| PROJ-2 (RLS) | Mandantentrennung auf Dokumenten |
| ADR-003 (Service-Architektur) | DokumentenService |

## 10. Fachliche Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| 500MB-Upload bricht ab | Mittel | Nutzerfrust | Resumable Upload (tus-Protokoll) |
| OCR-Qualitaet schlecht bei Scans | Mittel | Suche findet nichts | OCR-Qualitaetsanzeige, manuelle Verschlagwortung |
| Storage-Kosten steigen schnell | Mittel | Budgetrisiko | Speicher-Monitoring pro Tenant, Komprimierung |
