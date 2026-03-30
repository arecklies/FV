/**
 * Fristtyp-Labels (PROJ-29)
 *
 * Menschenlesbare Bezeichnungen fuer Fristtypen.
 * Extrahiert aus TSX gemaess Logik-Extraktions-Pflicht.
 */

const FRIST_TYP_LABELS: Record<string, string> = {
  gesamtfrist: "Gesamtfrist",
  beteiligungsfrist: "Beteiligungsfrist",
  nachforderungsfrist: "Nachforderungsfrist",
  widerspruchsfrist: "Widerspruchsfrist",
  vollstaendigkeitspruefung: "Vollständigkeitsprüfung",
  eingangsbestaetigung: "Eingangsbestätigung",
  baubeginn_wartefrist: "Baubeginn-Wartefrist",
  intern: "Interne Frist",
};

export function getFristTypLabel(typ: string): string {
  return FRIST_TYP_LABELS[typ] ?? typ;
}

/**
 * Formatiert ein ISO-Datum als deutsches Kurzformat (TT.MM.JJJJ).
 */
export function formatDatumKurz(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formatiert ein ISO-Datum als relatives "vor X Minuten/Stunden/Tagen".
 */
export function formatRelativeZeit(isoDate: string): string {
  const jetzt = Date.now();
  const zeit = new Date(isoDate).getTime();
  const diffMs = jetzt - zeit;
  const diffMin = Math.floor(diffMs / 60000);
  const diffStd = Math.floor(diffMs / 3600000);
  const diffTage = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  if (diffStd < 24) return `vor ${diffStd} Std.`;
  if (diffTage === 1) return "gestern";
  if (diffTage < 7) return `vor ${diffTage} Tagen`;

  return formatDatumKurz(isoDate);
}
