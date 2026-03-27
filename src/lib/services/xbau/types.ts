import { z } from "zod";

/**
 * XBau-Service Types (PROJ-7, ADR-015)
 *
 * Typen für XBau-Nachrichten, Validierung und Korrelation.
 */

// -- Richtung und Status --

export type NachrichtRichtung = "eingang" | "ausgang";

export type NachrichtStatus =
  | "empfangen"
  | "verarbeitet"
  | "abgewiesen"
  | "generiert"
  | "heruntergeladen";

// -- Fehlerkennzahl-Serien (XBau-Standard) --

export type FehlerkennzahlSerie = "X" | "V" | "S" | "A";

// -- Zod-Schemas für DB-Ergebnisse --

export const XBauNachrichtDbSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  nachrichten_uuid: z.string(),
  nachrichtentyp: z.string(),
  richtung: z.enum(["eingang", "ausgang"]),
  status: z.string(),
  vorgang_id: z.string().nullable(),
  referenz_uuid: z.string().nullable(),
  bezug_nachrichten_uuid: z.string().nullable(),
  bezug_aktenzeichen: z.string().nullable(),
  absender_behoerde: z.string().nullable(),
  empfaenger_behoerde: z.string().nullable(),
  kerndaten: z.record(z.string(), z.unknown()),
  fehler_details: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type XBauNachricht = z.infer<typeof XBauNachrichtDbSchema>;

/** Listendarstellung (ohne roh_xml, kerndaten kompakt) */
export const XBauNachrichtListItemSchema = z.object({
  id: z.string(),
  nachrichten_uuid: z.string(),
  nachrichtentyp: z.string(),
  richtung: z.enum(["eingang", "ausgang"]),
  status: z.string(),
  vorgang_id: z.string().nullable(),
  bezug_aktenzeichen: z.string().nullable(),
  absender_behoerde: z.string().nullable(),
  empfaenger_behoerde: z.string().nullable(),
  fehler_details: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string(),
});

export type XBauNachrichtListItem = z.infer<typeof XBauNachrichtListItemSchema>;

// -- Bezug-Element (Korrelation) --

export interface XBauBezug {
  referenz?: string;
  vorgang?: string;
  bezugNachricht?: {
    nachrichtenUUID: string;
    nachrichtentyp: string;
    erstellungszeitpunkt: string;
  };
}

// -- Nachrichtenkopf --

export interface XBauNachrichtenkopf {
  nachrichtenUUID: string;
  nachrichtentyp: string;
  erstellungszeitpunkt: string;
  autor?: string;
  leser?: string;
}

// -- Validierungsergebnis --

export interface XBauValidierungsergebnis {
  valid: boolean;
  xsdFehler: string[];
  schematronFehler: string[];
  fehlerkennzahl?: string;
}

// -- Parser-Ergebnis für 0200 --

export interface Parsed0200 {
  nachrichtenkopf: XBauNachrichtenkopf;
  bezug: XBauBezug;
  bauherr: {
    name: string;
    anschrift?: string;
  };
  grundstueck: {
    adresse?: string;
    flurstueck?: string;
    gemarkung?: string;
  };
  verfahrensartCode?: string;
  bezeichnung?: string;
}

// -- Nachrichtentyp-Labels --

export const NACHRICHTENTYP_LABELS: Record<string, string> = {
  "0200": "Bauantrag",
  "0201": "Formelle Prüfung",
  "0202": "Antragsänderung",
  "0210": "Baugenehmigung (Bescheid)",
  "0420": "Statistik: Daten Bauvorhaben",
  "0421": "Statistik: Baugenehmigung",
  "0422": "Statistik: Abbruchgenehmigung",
  "0423": "Statistik: Bautätigkeit Hochbau",
  "0424": "Statistik: Bautätigkeit Tiefbau",
  "0425": "Statistik: Baufertigstellung",
  "0426": "Statistik: Bauüberhang",
  "0427": "Statistik: Wohnungsbestand",
  "1100": "Rückweisung",
  "1180": "Eingangsquittung",
};

export function getNachrichtenLabel(typ: string): string {
  return NACHRICHTENTYP_LABELS[typ] ?? `Nachricht ${typ}`;
}
