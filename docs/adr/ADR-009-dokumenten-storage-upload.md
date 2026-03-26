# ADR-009: Dokumenten-Storage und Upload-Strategie

**Status:** Accepted
**Datum:** 2026-03-26
**Autor:** Senior Software Architect

## Kontext

PROJ-5 (Dokumentenverwaltung) fordert Upload bis 500 MB (Grossformatplaene), Versionierung, Vorschau und OCR-Indexierung. Vercel Serverless hat ein Body-Limit von ca. 4,5 MB -- direkter Upload ueber API Routes ist fuer Bauplaene unmoeglich. Supabase Storage bietet S3-kompatiblen Objektspeicher mit signierter URL fuer direkten Client-Upload.

## Entscheidung

**Supabase Storage mit Client-seitigem Direct Upload ueber signierte URLs.**

### Upload-Flow

```
1. Client -> API Route: "Ich will Datei X hochladen" (Metadaten, kein Body)
2. API Route -> Supabase Storage: Signierte Upload-URL generieren
3. API Route -> Client: Signierte URL + Upload-ID zurueck
4. Client -> Supabase Storage: Direkter Upload (PUT, bis 500 MB)
5. Client -> API Route: "Upload abgeschlossen" (Upload-ID)
6. API Route -> DB: Dokument-Metadaten schreiben (vorgang_id, version, mime_type)
7. API Route -> Background Job: OCR-Indexierung anstossen (ADR-008)
```

### Storage-Struktur

```
storage/
  └── dokumente/
      └── {tenant_id}/
          └── {vorgang_id}/
              └── {dokument_id}/
                  ├── v1/original.pdf
                  ├── v2/original.pdf    (Versionierung)
                  └── thumbnail.jpg      (generiert)
```

### Storage Policies (RLS fuer Storage)

```sql
-- Bucket: dokumente (private)
-- Policy: Nur eigener Tenant kann lesen
CREATE POLICY "tenant_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'dokumente' AND (storage.foldername(name))[1] = (auth.jwt() ->> 'tenant_id'));

-- Policy: Nur eigener Tenant kann hochladen
CREATE POLICY "tenant_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dokumente' AND (storage.foldername(name))[1] = (auth.jwt() ->> 'tenant_id'));
```

### Resumable Upload (fuer grosse Dateien)

- Supabase Storage unterstuetzt `tus`-Protokoll ab Pro-Plan
- Fuer MVP (lokal): Standard-PUT genuegt (kein Timeout lokal)
- Fuer Produktion: tus aktivieren fuer Dateien > 50 MB
- Client-Komponente: `@uppy/tus` oder eigene Implementierung mit Progress-Callback

### Dateigroessen-Limits

| Umgebung | Limit | Methode |
|---|---|---|
| Lokal (MVP) | 500 MB | Direct PUT, kein Timeout |
| Supabase Free | 50 MB | Direct PUT |
| Supabase Pro | 5 GB | tus-Protokoll |

### Unterstuetzte Formate

PDF, DWG, DXF, TIFF, JPEG, XLS/XLSX, DOCX (aus Anforderungskatalog Abschnitt 2.5). Content-Type-Validierung serverseitig vor Upload-URL-Generierung.

## Alternativen verworfen

### 1. Upload ueber API Route (Body)
- **Contra:** Vercel Body-Limit 4,5 MB. Selbst lokal ist Streaming grosser Dateien ueber Next.js API Routes fragil.
- **Fazit:** Nicht praktikabel fuer 500 MB Bauplaene.

### 2. Externer S3-Bucket (AWS, Hetzner)
- **Pro:** Volle Kontrolle, deutscher Anbieter moeglich.
- **Contra:** Zusaetzlicher Service, eigenes Key-Management, kein nativer Supabase-RLS auf Storage.
- **Fazit:** Fuer Self-Hosted-Phase evaluieren. Im MVP Supabase Storage ausreichend.

### 3. MinIO Self-Hosted
- **Pro:** S3-kompatibel, Open Source, deutscher Server.
- **Contra:** Eigenes Ops, kein Integration mit Supabase Auth/RLS.
- **Fazit:** Option fuer Phase 2 (Self-Hosted), nicht fuer MVP.

## Konsequenzen

### Positiv
- Kein Upload-Traffic ueber die API Route (entlastet Serverless)
- Storage Policies nutzen JWT-Claims fuer Tenant-Isolation
- tus-Protokoll fuer Resumable Upload verfuegbar
- Versionierung ueber Ordnerstruktur (einfach, nachvollziehbar)

### Negativ
- Client muss signierte URL handhaben (etwas komplexere Frontend-Logik)
- Storage Policies sind weniger flexibel als DB-RLS (pfadbasiert statt spaltenbasiert)
- OCR-Indexierung erfordert zusaetzlichen Download aus Storage in den Worker

## Beteiligte Rollen

- Software Architect: Storage-Architektur
- Backend Developer: Upload-API, signierte URLs, Storage Policies
- Frontend Developer: DropZone-Komponente mit Direct Upload
- Security Engineer: Storage Policies, Content-Type-Validierung, Malware-Scan-Strategie

## Referenzen
- PROJ-5: Dokumentenverwaltung (FA-1 bis FA-8)
- ADR-008: Background Jobs (OCR-Indexierung als async Job)
- Anforderungskatalog Abschnitt 2.5: Dokumentenverwaltung
- Kick-off Frontend Developer: "500MB-Upload auf Vercel unmoeglich"
