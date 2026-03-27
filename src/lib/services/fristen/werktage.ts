/**
 * Werktage-Berechnung (PROJ-4 FA-3, NFR-1)
 *
 * Reine Logik ohne DB-Zugriff. Feiertage werden als Set<string> (ISO-Datumsstrings) injiziert.
 * NFR-1: < 100ms Ausführungszeit.
 */

/**
 * Prüft ob ein Datum ein Wochenende ist (Samstag = 6, Sonntag = 0).
 */
export function istWochenende(datum: Date): boolean {
  const tag = datum.getDay();
  return tag === 0 || tag === 6;
}

/**
 * Formatiert ein Date-Objekt als ISO-Datumsstring (YYYY-MM-DD) für Feiertags-Lookup.
 */
export function toIsoDate(datum: Date): string {
  const y = datum.getFullYear();
  const m = String(datum.getMonth() + 1).padStart(2, "0");
  const d = String(datum.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Addiert Werktage auf ein Startdatum.
 * Überspringt Wochenenden und Feiertage.
 *
 * @param startDatum - Ausgangsdatum
 * @param werktage - Anzahl der Werktage (positiv)
 * @param feiertage - Set von ISO-Datumsstrings (YYYY-MM-DD) die als Feiertage gelten
 * @returns Enddatum (der letzte Werktag)
 */
export function addiereWerktage(
  startDatum: Date,
  werktage: number,
  feiertage: Set<string>
): Date {
  if (werktage <= 0) return new Date(startDatum);

  let gezaehlt = 0;
  const current = new Date(startDatum);

  while (gezaehlt < werktage) {
    current.setDate(current.getDate() + 1);
    if (!istWochenende(current) && !feiertage.has(toIsoDate(current))) {
      gezaehlt++;
    }
  }

  return current;
}

/**
 * Berechnet die Anzahl der Werktage zwischen zwei Daten.
 * Start-Datum exklusiv, End-Datum inklusiv.
 *
 * @returns Anzahl Werktage (kann negativ sein wenn endDatum vor startDatum)
 */
export function berechneWerktageDazwischen(
  startDatum: Date,
  endDatum: Date,
  feiertage: Set<string>
): number {
  const start = new Date(startDatum);
  const end = new Date(endDatum);

  // Normalisiere auf Tagesbeginn
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (end <= start) return 0;

  let werktage = 0;
  const current = new Date(start);

  while (current < end) {
    current.setDate(current.getDate() + 1);
    if (!istWochenende(current) && !feiertage.has(toIsoDate(current))) {
      werktage++;
    }
  }

  return werktage;
}

/** Standard-Schwellenwerte fuer die Ampelberechnung (FA-4) */
export const AMPEL_STANDARD_GELB = 50;
export const AMPEL_STANDARD_ROT = 25;

/** Optionale Schwellenwerte fuer konfigurierbare Ampel (PROJ-34) */
export interface AmpelSchwellenwerte {
  gelb_ab?: number | null;
  rot_ab?: number | null;
}

/**
 * Berechnet den Ampelstatus gemaess FA-4 (PROJ-4) und PROJ-34:
 * - Gruen: > gelb_ab% der Frist uebrig (Standard: 50%)
 * - Gelb: rot_ab% bis gelb_ab% uebrig (Standard: 25-50%)
 * - Rot: < rot_ab% uebrig ODER < 5 Werktage uebrig (Standard: 25%)
 * - Dunkelrot: Frist ueberschritten (0 oder weniger Werktage uebrig)
 *
 * @param gesamtWerktage - Gesamtanzahl Werktage der Frist
 * @param verbleibendeWerktage - Verbleibende Werktage bis Fristende
 * @param schwellenwerte - Optionale konfigurierte Schwellenwerte (PROJ-34). Fallback auf 50/25.
 * @returns Ampelstatus
 */
export function berechneAmpelStatus(
  gesamtWerktage: number,
  verbleibendeWerktage: number,
  schwellenwerte?: AmpelSchwellenwerte
): "gruen" | "gelb" | "rot" | "dunkelrot" {
  if (verbleibendeWerktage <= 0) return "dunkelrot";

  const gelbAb = schwellenwerte?.gelb_ab ?? AMPEL_STANDARD_GELB;
  const rotAb = schwellenwerte?.rot_ab ?? AMPEL_STANDARD_ROT;

  const prozentUebrig = (verbleibendeWerktage / gesamtWerktage) * 100;

  if (verbleibendeWerktage < 5) return "rot";
  if (prozentUebrig < rotAb) return "rot";
  if (prozentUebrig <= gelbAb) return "gelb";
  return "gruen";
}

/**
 * Berechnet den Prozentsatz der verbrauchten Frist.
 */
export function berechneProzentVerbraucht(
  gesamtWerktage: number,
  verbleibendeWerktage: number
): number {
  if (gesamtWerktage <= 0) return 100;
  const verbraucht = ((gesamtWerktage - verbleibendeWerktage) / gesamtWerktage) * 100;
  return Math.min(100, Math.max(0, Math.round(verbraucht)));
}
