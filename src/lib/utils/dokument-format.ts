/**
 * Formatierungsfunktionen fuer Dokumente (PROJ-5).
 * Reine Logik ohne React-Abhaengigkeiten.
 */

import { ERLAUBTE_MIME_TYPES } from "@/lib/services/dokumente/types";
import type { DokumentKategorie } from "@/lib/services/dokumente/types";

/**
 * Formatiert eine Dateigroesse in menschenlesbare Einheiten (KB, MB, GB).
 */
export function formatiereGroesse(bytes: number): string {
  if (bytes < 0) return "0 B";
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Formatiert ein ISO-Datum im deutschen Format (TT.MM.JJJJ, HH:MM).
 */
export function formatiereDatum(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

/**
 * Menschenlesbare Kategorie-Labels.
 */
export const KATEGORIE_LABELS: Record<DokumentKategorie, string> = {
  antragsunterlagen: "Antragsunterlagen",
  plaene: "Pläne",
  gutachten: "Gutachten",
  bescheide: "Bescheide",
  schriftverkehr: "Schriftverkehr",
  sonstiges: "Sonstiges",
};

/**
 * Prüft, ob ein MIME-Type erlaubt ist (clientseitige Vorab-Pruefung).
 */
export function istMimeTypeErlaubt(mimeType: string): boolean {
  const erlaubt = [...new Set(ERLAUBTE_MIME_TYPES.values())];
  return erlaubt.includes(mimeType);
}

/**
 * Ermittelt den MIME-Type aus einem Dateinamen.
 */
export function mimeTypeAusDateiname(dateiname: string): string | null {
  const parts = dateiname.split(".");
  if (parts.length < 2) return null;
  const ext = parts[parts.length - 1].toLowerCase();
  return ERLAUBTE_MIME_TYPES.get(ext) ?? null;
}

/**
 * Erlaubte Dateiendungen als kommaseparierter String fuer accept-Attribut.
 */
export function erlaubteEndungenAlsAccept(): string {
  return [...ERLAUBTE_MIME_TYPES.keys()].map((ext) => `.${ext}`).join(",");
}
