import { ERLAUBTE_MIME_TYPES, ERLAUBTE_MIME_TYPE_WERTE } from "./types";

/**
 * Dokumente-Validierung (PROJ-5, ADR-009)
 * Content-Type- und Dateiendung-Pruefung.
 */

/**
 * Prueft ob der MIME-Type in der Erlaubt-Liste steht.
 */
export function istErlaubterMimeType(mimeType: string): boolean {
  return ERLAUBTE_MIME_TYPE_WERTE.includes(mimeType);
}

/**
 * Extrahiert die Dateiendung aus einem Dateinamen (lowercase, ohne Punkt).
 * Gibt null zurueck wenn keine Endung vorhanden.
 */
export function extrahiereDateiendung(dateiname: string): string | null {
  const teile = dateiname.split(".");
  if (teile.length < 2) return null;
  return teile[teile.length - 1].toLowerCase();
}

/**
 * Prueft ob Dateiendung und MIME-Type konsistent sind.
 * Gibt true zurueck wenn die Endung zum MIME-Type passt.
 */
export function istKonsistenterMimeType(dateiname: string, mimeType: string): boolean {
  const endung = extrahiereDateiendung(dateiname);
  if (!endung) return false;

  const erwarteterMimeType = ERLAUBTE_MIME_TYPES.get(endung);
  if (!erwarteterMimeType) return false;

  return erwarteterMimeType === mimeType;
}

/**
 * Gibt die Dateiendung fuer einen MIME-Type zurueck (fuer Storage-Pfad).
 * Bevorzugt die kanonische Endung (pdf statt PDF, jpg statt jpeg).
 */
export function endungFuerMimeType(mimeType: string): string | null {
  // Bevorzugte Endungen (kanonisch)
  const BEVORZUGTE: Record<string, string> = {
    "application/pdf": "pdf",
    "image/tiff": "tiff",
    "image/jpeg": "jpg",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/acad": "dwg",
    "application/dxf": "dxf",
  };

  return BEVORZUGTE[mimeType] ?? null;
}
