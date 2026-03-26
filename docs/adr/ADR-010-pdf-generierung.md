# ADR-010: PDF-Generierung und Bescheid-Rendering

**Status:** Accepted
**Datum:** 2026-03-26
**Autor:** Senior Software Architect

## Kontext

PROJ-6 (Bescheiderzeugung) erfordert PDF/A-Erzeugung aus HTML-Vorlagen mit Vorgangsdaten. Puppeteer (Headless Chrome) ist die gaengige Loesung, laeuft aber nicht auf Vercel Serverless (kein Chromium). ADR-008 definiert lokale Node.js-Worker fuer die MVP-Phase.

## Entscheidung

**Puppeteer lokal (MVP) + evaluierbare Cloud-Alternative fuer Produktion.**

### MVP (lokale Entwicklung)
- **Puppeteer** mit lokal installiertem Chromium
- HTML-Template-Engine: Bescheidvorlagen als HTML mit Platzhaltern (`{{aktenzeichen}}`, `{{antragsteller}}`)
- Puppeteer rendert HTML zu PDF
- PDF/A-Konvertierung ueber `ghostscript` (lokal verfuegbar) oder `pdf-lib` (Node.js)
- Laeuft als Background Job (ADR-008, Stufe 0: lokaler Worker)

### Produktion (spaeter evaluieren)
| Option | Vorteile | Nachteile |
|---|---|---|
| **Gotenberg** (Docker-basiert) | Open Source, Chromium + LibreOffice, REST-API | Eigener Container, Self-Hosted |
| **Supabase Edge Function + deno-puppeteer** | Kein eigener Service | Experimentell, 150s Timeout |
| **Externer Dienst (CloudConvert, PDF.co)** | Kein Ops-Aufwand | US-Anbieter, Kosten pro Dokument, Datenresidenz |

Entscheidung fuer Produktion wird nach MVP-Erfahrung getroffen. Die HTML-Template-Schnittstelle bleibt gleich -- nur der Renderer aendert sich.

### Template-Architektur

```
src/lib/services/bescheid/
  ├── templates/           # HTML-Vorlagen (Handlebars oder EJS)
  │   ├── baugenehmigung.html
  │   ├── ablehnungsbescheid.html
  │   └── vorbescheid.html
  ├── renderer.ts          # Puppeteer-Wrapper (austauschbar)
  ├── placeholder.ts       # Platzhalter-Ersetzung mit Vorgangsdaten
  └── pdf-a-converter.ts   # PDF -> PDF/A Konvertierung
```

## Konsequenzen

- (+) Puppeteer lokal funktioniert ohne Einschraenkung
- (+) HTML-Templates sind einfach zu pflegen (vs. LaTeX oder DOCX)
- (+) Renderer ist austauschbar (Puppeteer -> Gotenberg -> Cloud-Dienst)
- (-) Puppeteer benoetigt ~300 MB Chromium-Download
- (-) PDF/A-Konvertierung ist ein Zusatzschritt

## Referenzen
- PROJ-6: Bescheiderzeugung
- ADR-008: Background Jobs (PDF als async Job)
- Anforderungskatalog Abschnitt 2.6: PDF/A fuer revisionssichere Archivierung
