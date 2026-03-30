import type { MeineAufgabe } from "@/lib/services/tagesansicht/types";

/**
 * Gruppiert Aufgaben nach workflow_schritt_id (PROJ-29).
 *
 * Extrahiert aus Komponente gemaess Logik-Extraktions-Pflicht.
 * Reihenfolge: Gruppen erscheinen in der Reihenfolge des ersten Vorkommens.
 */
export function gruppiereAufgabenNachSchritt(
  aufgaben: MeineAufgabe[]
): Map<string, MeineAufgabe[]> {
  const gruppen = new Map<string, MeineAufgabe[]>();
  for (const aufgabe of aufgaben) {
    const key = aufgabe.workflow_schritt_id;
    const liste = gruppen.get(key) ?? [];
    liste.push(aufgabe);
    gruppen.set(key, liste);
  }
  return gruppen;
}
