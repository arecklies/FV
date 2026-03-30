import type { PlatzhalterKatalog, PlatzhalterDefinition } from "./types";
import type { Vorgang } from "@/lib/services/verfahren/types";

/**
 * Platzhalter-Engine (PROJ-6 FA-3, FA-4)
 *
 * Erkennt {{feldname}}-Platzhalter in Textbausteinen und ersetzt sie
 * durch Vorgangsdaten. Nicht-befuellbare Platzhalter werden gemeldet.
 */

/** Regex fuer {{feldname}}-Platzhalter (Handlebars-kompatibel) */
const PLATZHALTER_REGEX = /\{\{([a-z_]+)\}\}/g;

/**
 * Extrahiert alle Platzhalter-Namen aus einem Text.
 * Gibt deduplizierte, sortierte Liste zurueck.
 */
export function extractPlaceholders(text: string): string[] {
  const matches = new Set<string>();
  let match: RegExpExecArray | null;

  // Reset lastIndex fuer wiederholte Aufrufe
  const regex = new RegExp(PLATZHALTER_REGEX.source, "g");
  while ((match = regex.exec(text)) !== null) {
    matches.add(match[1]);
  }

  return Array.from(matches).sort();
}

/**
 * Ersetzt Platzhalter im Text durch die uebergebenen Werte.
 * Gibt den aufgeloesten Text und eine Liste fehlender Platzhalter zurueck.
 */
export function resolvePlaceholders(
  text: string,
  werte: Record<string, string>
): { resolved: string; missing: string[] } {
  const missing = new Set<string>();

  const regex = new RegExp(PLATZHALTER_REGEX.source, "g");
  const resolved = text.replace(regex, (_fullMatch, feldname: string) => {
    const wert = werte[feldname];
    if (wert !== undefined && wert !== null && wert !== "") {
      return wert;
    }
    missing.add(feldname);
    return `{{${feldname}}}`;
  });

  return {
    resolved,
    missing: Array.from(missing).sort(),
  };
}

// -- Platzhalter-Katalog (PROJ-6 FA-3) --

/**
 * Verfuegbare Platzhalter mit Beschreibung und Beispiel.
 * Resolver-Funktionen extrahieren Werte aus Vorgang-Daten.
 */
export const PLATZHALTER_KATALOG: PlatzhalterKatalog = new Map<string, PlatzhalterDefinition>([
  ["aktenzeichen", { beschreibung: "Aktenzeichen des Vorgangs", beispiel: "2026/BG-0142" }],
  ["antragsteller", { beschreibung: "Name des Bauherrn/Antragstellers", beispiel: "Max Mustermann" }],
  ["antragsdatum", { beschreibung: "Datum des Eingangs", beispiel: "15.03.2026" }],
  ["bauvorhaben_bezeichnung", { beschreibung: "Bezeichnung des Bauvorhabens", beispiel: "Neubau Einfamilienhaus" }],
  ["grundstueck_adresse", { beschreibung: "Adresse des Grundstuecks", beispiel: "Musterstraße 1, 50667 Köln" }],
  ["grundstueck_gemarkung", { beschreibung: "Gemarkung des Grundstuecks", beispiel: "Koeln" }],
  ["grundstueck_flurstueck", { beschreibung: "Flurstueck des Grundstuecks", beispiel: "1234/5" }],
  ["datum", { beschreibung: "Aktuelles Datum (Bescheiddatum)", beispiel: "29.03.2026" }],
  ["behoerde_name", { beschreibung: "Name der Behoerde", beispiel: "Bauaufsichtsamt Stadt Koeln" }],
  ["behoerde_anschrift", { beschreibung: "Anschrift der Behoerde", beispiel: "Willy-Brandt-Platz 2, 50679 Koeln" }],
  ["verfahrensart", { beschreibung: "Bezeichnung der Verfahrensart", beispiel: "Baugenehmigungsverfahren" }],
  ["verwaltungsgericht", { beschreibung: "Zustaendiges Verwaltungsgericht", beispiel: "Koeln" }],
  ["verwaltungsgericht_anschrift", { beschreibung: "Anschrift des Verwaltungsgerichts", beispiel: "Appellhofplatz, 50667 Koeln" }],
]);

/**
 * Extrahiert Platzhalter-Werte aus Vorgangsdaten.
 * Behoerden-Daten (behoerde_name etc.) werden spaeter aus Tenant-Settings geladen.
 */
export function resolveVorgangPlatzhalter(
  vorgang: Vorgang,
  verfahrensartBezeichnung?: string
): Record<string, string> {
  const werte: Record<string, string> = {};

  // Vorgang-Felder
  if (vorgang.aktenzeichen) werte.aktenzeichen = vorgang.aktenzeichen;
  if (vorgang.bauherr_name) werte.antragsteller = vorgang.bauherr_name;
  if (vorgang.eingangsdatum) werte.antragsdatum = formatDatum(vorgang.eingangsdatum);
  if (vorgang.bezeichnung) werte.bauvorhaben_bezeichnung = vorgang.bezeichnung;
  if (vorgang.grundstueck_adresse) werte.grundstueck_adresse = vorgang.grundstueck_adresse;
  if (vorgang.grundstueck_gemarkung) werte.grundstueck_gemarkung = vorgang.grundstueck_gemarkung;
  if (vorgang.grundstueck_flurstueck) werte.grundstueck_flurstueck = vorgang.grundstueck_flurstueck;

  // Aktuelles Datum
  werte.datum = formatDatum(new Date().toISOString());

  // Verfahrensart (muss extern aufgeloest werden)
  if (verfahrensartBezeichnung) werte.verfahrensart = verfahrensartBezeichnung;

  return werte;
}

/** Hilfsfunktion: ISO-Datum in deutsches Format (TT.MM.JJJJ) */
function formatDatum(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}
