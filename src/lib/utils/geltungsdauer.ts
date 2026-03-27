/**
 * Geltungsdauer-Utility (PROJ-48)
 * Farblogik und Labels für Geltungsdauer-Anzeige.
 */

export type GeltungsdauerStatus = "gruen" | "gelb" | "rot" | "erloschen";

export interface GeltungsdauerInfo {
  status: GeltungsdauerStatus;
  label: string;
  tageVerbleibend: number;
  ablaufdatum: string;
}

const GELTUNGSDAUER_CONFIG: Record<
  GeltungsdauerStatus,
  { label: string; className: string }
> = {
  gruen: {
    label: "Gültig",
    className: "bg-green-100 text-green-800 border-green-300",
  },
  gelb: {
    label: "Läuft bald ab",
    className: "bg-yellow-100 text-yellow-800 border-yellow-400",
  },
  rot: {
    label: "Ablauf kritisch",
    className: "bg-red-100 text-red-800 border-red-300",
  },
  erloschen: {
    label: "Erloschen",
    className: "bg-red-200 text-red-900 border-red-500",
  },
};

/**
 * Berechnet den Geltungsdauer-Status anhand des Ablaufdatums.
 * US-2 AC-2: Grün (> 6 Mo), Gelb (< 6 Mo), Rot (< 3 Mo), Erloschen (abgelaufen)
 */
export function berechneGeltungsdauerStatus(geltungsdauerBis: string): GeltungsdauerInfo {
  const ablauf = new Date(geltungsdauerBis);
  const jetzt = new Date();
  const diffMs = ablauf.getTime() - jetzt.getTime();
  const tage = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let status: GeltungsdauerStatus;
  if (tage <= 0) {
    status = "erloschen";
  } else if (tage < 90) {
    status = "rot";
  } else if (tage < 180) {
    status = "gelb";
  } else {
    status = "gruen";
  }

  return {
    status,
    label: GELTUNGSDAUER_CONFIG[status].label,
    tageVerbleibend: Math.max(0, tage),
    ablaufdatum: ablauf.toLocaleDateString("de-DE"),
  };
}

export function getGeltungsdauerClassName(status: GeltungsdauerStatus): string {
  return GELTUNGSDAUER_CONFIG[status].className;
}
