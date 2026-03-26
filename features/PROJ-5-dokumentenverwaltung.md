# PROJ-5: Dokumentenverwaltung mit Versionierung

**Status:** Planned | **Phase:** 1 (Kern-MVP) | **Erstellt:** 2026-03-25
**Letzte Verfeinerung:** 2026-03-26 (req-refine: ADR-009 referenziert, OCR als SHOULD HAVE, Dokument-Zugriff zurueckgestellt)

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

### US-1: Drag-and-Drop Upload
Als Einsteiger moechte ich Dokumente per Drag-and-Drop hochladen.
- AC-1: Drop-Zone auf Vorgangsseite sichtbar
- AC-2: Upload bis 500MB ohne Timeout (Signed URL + tus-Protokoll, ADR-009)
- AC-3: Fortschrittsanzeige waehrend Upload
- AC-4: Content-Type-Validierung serverseitig vor Upload-URL-Generierung (ADR-009)
- AC-5: Loading-, Error- und Empty-States fuer Upload-Bereich

### US-2: Dokumenten-Versionierung
Als Sachbearbeiter moechte ich eine neue Planversion hochladen, die die alte ersetzt.
- AC-1: "Neue Version" Aktion bei bestehendem Dokument
- AC-2: Alte Version bleibt zugreifbar (Versionshistorie)
- AC-3: Aktuelle Version ist Standard-Anzeige

### US-3: Dokument finden
Als Sachbearbeiter moechte ich ein Dokument ueber Suche finden.
- AC-1: Suche ueber Dateiname und manuelle Verschlagwortung (MUST HAVE)
- AC-2: Suche ueber OCR-extrahierten Text (SHOULD HAVE, abhaengig von OCR-Implementierung)
- AC-3: Ergebnisse in < 3 Sekunden

## 5. Nicht-funktionale Anforderungen

- NFR-1: Upload bis 500MB ohne Abbruch (Resumable Upload via tus, ADR-009)
- NFR-2: Dokumentenvorschau < 3s fuer Dateien bis 10MB
- NFR-3: Automatisches Zwischenspeichern bei Formulareingaben (kein Datenverlust bei Verbindungsabbruch)
- NFR-4: Mandantentrennung auf Dokument-Ebene (RLS + Storage Policies, ADR-009)

## 6. Spezialisten-Trigger

- **Backend Developer:** DokumentenService, Upload-Handling (Signed URLs), OCR-Integration
- **Database Architect:** Dokument-Schema (`vorgang_dokumente`), Versionierung, Volltext-Index
- **Frontend Developer:** Drop-Zone, Vorschau, Versionshistorie

## 7. Offene Fragen

1. OCR-Dienst: Tesseract lokal oder externer Service? (SHOULD HAVE -- Entscheidung kann nach MVP fallen)
2. ~~Storage: Supabase Storage oder separater S3-kompatibler Dienst?~~ **Geklaert:** ADR-009: Supabase Storage fuer MVP, separater Storage fuer Produktion evaluieren.
3. DWG/DXF-Vorschau: Im Browser moeglich oder nur Download?
4. **Dokument-Zugriffssteuerung:** Feingranulare Berechtigungen (pro Rolle, pro Dokumentkategorie) -- **zurueckgestellt**. Entscheidung in spaeterer Phase, wenn RBAC-Erfahrung vorliegt.

## 8. Annahmen

- Supabase Storage fuer MVP (ADR-009), separater Storage fuer Produktion evaluieren
- OCR ist SHOULD HAVE im MVP, MUST HAVE ab Phase 2
- DWG/DXF werden nicht im Browser angezeigt (nur Download)
- **Dokument-Zugriff MVP:** Alle Benutzer des Mandanten sehen alle Dokumente aller Vorgaenge des Mandanten (einfachste RLS auf tenant_id). Feingranulare Berechtigungen zurueckgestellt.

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
