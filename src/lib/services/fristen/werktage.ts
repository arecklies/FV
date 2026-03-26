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

/**
 * Berechnet den Ampelstatus gemäß FA-4:
 * - Grün: > 50% der Frist übrig
 * - Gelb: 25-50% übrig
 * - Rot: < 25% übrig ODER < 5 Werktage übrig
 * - Dunkelrot: Frist überschritten (0 oder weniger Werktage übrig)
 *
 * @param gesamtWerktage - Gesamtanzahl Werktage der Frist
 * @param verbleibendeWerktage - Verbleibende Werktage bis Fristende
 * @returns Ampelstatus
 */
export function berechneAmpelStatus(
  gesamtWerktage: number,
  verbleibendeWerktage: number
): "gruen" | "gelb" | "rot" | "dunkelrot" {
  if (verbleibendeWerktage <= 0) return "dunkelrot";

  const prozentUebrig = (verbleibendeWerktage / gesamtWerktage) * 100;

  if (verbleibendeWerktage < 5) return "rot";
  if (prozentUebrig < 25) return "rot";
  if (prozentUebrig <= 50) return "gelb";
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
