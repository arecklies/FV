/**
 * Vorkonfigurierte Pause-Gründe für Frist-Hemmung (PROJ-43)
 *
 * Quelle: Kunden-Session Soest 28.03.2026 (Herr Brandt)
 * "Die Gründe sind immer dieselben — Auswahlliste statt Freitext"
 */

export interface PauseGrund {
  value: string;
  label: string;
}

export const PAUSE_GRUENDE: PauseGrund[] = [
  { value: "nachforderung_bauherr", label: "Nachforderung Bauherr" },
  { value: "stellungnahme_toeb", label: "Stellungnahme TöB ausstehend" },
  { value: "nachbarbeteiligung", label: "Nachbarbeteiligung läuft" },
  { value: "gutachten_ausstehend", label: "Gutachten ausstehend" },
  { value: "rueckfrage_entwurfsverfasser", label: "Rückfrage an Entwurfsverfasser" },
  { value: "sonstiges", label: "Sonstiges" },
];

export const SONSTIGES_VALUE = "sonstiges";
