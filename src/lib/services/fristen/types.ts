import { z } from "zod";

/**
 * Fristen-Types (ADR-003, ADR-006, PROJ-4)
 * Single Source of Truth für Fristmanagement-Interfaces.
 */

// -- Zod-Schemas (Validierung) --

/** Ampelstatus gemäß FA-4 */
export const AmpelStatusSchema = z.enum(["gruen", "gelb", "rot", "dunkelrot", "gehemmt"]);
export type AmpelStatus = z.infer<typeof AmpelStatusSchema>;

/** Fristtypen gemäß config_fristen */
export const FristTypSchema = z.enum([
  "gesamtfrist",
  "beteiligungsfrist",
  "nachforderungsfrist",
  "widerspruchsfrist",
  "vollstaendigkeitspruefung",
]);
export type FristTyp = z.infer<typeof FristTypSchema>;

/** POST /api/vorgaenge/[id]/fristen — Frist anlegen */
export const CreateFristSchema = z.object({
  typ: z.string().min(1, "Fristtyp ist Pflichtfeld"),
  bezeichnung: z.string().min(1, "Bezeichnung ist Pflichtfeld"),
  werktage: z.number().int().positive("Werktage müssen positiv sein"),
  start_datum: z.string().datetime("Ungültiges Startdatum"),
});

/** PATCH /api/vorgaenge/[id]/fristen/[fristId]/verlaengerung — Frist verlängern (US-4) */
export const VerlaengerungSchema = z.object({
  zusaetzliche_werktage: z.number().int().positive("Zusätzliche Werktage müssen positiv sein"),
  begruendung: z.string().min(1, "Begründung ist Pflichtfeld"),
});

/** POST /api/vorgaenge/[id]/fristen/[fristId]/hemmung — Frist hemmen (US-5) */
export const HemmungStartSchema = z.object({
  grund: z.string().min(1, "Hemmungsgrund ist Pflichtfeld"),
  ende: z.string().datetime("Ungültiges Enddatum").optional(),
});

/** GET /api/fristen/gefaehrdet — Query-Parameter */
export const GefaehrdeteQuerySchema = z.object({
  seite: z.coerce.number().int().positive().optional().default(1),
  pro_seite: z.coerce.number().int().min(1).max(100).optional().default(25),
  gruppiert_nach: z.enum(["sachbearbeiter", "status"]).optional(),
  nur_ueberschritten: z.coerce.boolean().optional().default(false),
});

// -- Zod-Schemas für DB-Ergebnisse (B-003: statt Type Assertions) --

export const VorgangFristDbSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  vorgang_id: z.string(),
  typ: z.string(),
  bezeichnung: z.string(),
  start_datum: z.string(),
  end_datum: z.string(),
  werktage: z.number(),
  bundesland: z.string(),
  status: AmpelStatusSchema,
  gehemmt: z.boolean(),
  hemmung_grund: z.string().nullable(),
  hemmung_start: z.string().nullable(),
  hemmung_ende: z.string().nullable(),
  hemmung_tage: z.number().nullable(),
  verlaengert: z.boolean(),
  verlaengerung_grund: z.string().nullable(),
  original_end_datum: z.string().nullable(),
  aktiv: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ConfigFristDbSchema = z.object({
  id: z.string(),
  bundesland: z.string(),
  verfahrensart_id: z.string(),
  typ: z.string(),
  bezeichnung: z.string(),
  werktage: z.number(),
  rechtsgrundlage: z.string().nullable(),
  aktiv: z.boolean(),
  gelb_ab: z.number().int().min(1).max(99).nullable().optional(),
  rot_ab: z.number().int().min(1).max(99).nullable().optional(),
});

export const ConfigFeiertagDbSchema = z.object({
  id: z.string(),
  bundesland: z.string().nullable(),
  datum: z.string(),
  bezeichnung: z.string(),
  jahr: z.number(),
});

// -- TypeScript-Interfaces (abgeleitet aus Zod-Schemas) --

export type VorgangFrist = z.infer<typeof VorgangFristDbSchema>;
export type ConfigFrist = z.infer<typeof ConfigFristDbSchema>;
export type ConfigFeiertag = z.infer<typeof ConfigFeiertagDbSchema>;

/** Ergebnis der Ampelberechnung */
export interface AmpelBerechnung {
  status: AmpelStatus;
  verbleibende_werktage: number;
  prozent_verbraucht: number;
}

/** Gefährdete Frist mit Vorgang-Informationen (für Dashboard US-3) */
export interface GefaehrdeteFrist {
  frist: VorgangFrist;
  vorgang_aktenzeichen: string;
  vorgang_bezeichnung: string | null;
  zustaendiger_user_id: string | null;
}

/** Gruppierte gefährdete Fristen nach Sachbearbeiter (PROJ-21 US-1) */
export interface GruppierteFristen {
  zustaendiger_user_id: string;
  anzahl: number;
  fristen: GefaehrdeteFrist[];
}
