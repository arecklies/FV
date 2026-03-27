import { z } from "zod";

/**
 * Verlängerung-Types (PROJ-48)
 * Single Source of Truth für Geltungsdauer-Verlängerung.
 */

// -- Zod-Schemas (Validierung) --

/** POST /api/vorgaenge/[id]/geltungsdauer-verlaengerung */
export const CreateVerlaengerungSchema = z.object({
  antragsdatum: z.string().date("Ungültiges Antragsdatum (YYYY-MM-DD erwartet)"),
  begruendung: z.string().min(10, "Begründung muss mindestens 10 Zeichen lang sein"),
  verlaengerung_tage: z.number().int().positive("Verlängerung muss positiv sein").max(1095, "Maximal 1095 Tage (3 Jahre)"),
});

// -- Zod-Schemas für DB-Ergebnisse --

export const VerlaengerungDbSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  vorgang_id: z.string(),
  altes_datum: z.string(),
  neues_datum: z.string(),
  antragsdatum: z.string(),
  begruendung: z.string(),
  verlaengerung_tage: z.number(),
  sachbearbeiter_id: z.string(),
  created_at: z.string(),
});

/** Verlängerung mit aufgelöster E-Mail-Adresse */
export const VerlaengerungMitEmailSchema = VerlaengerungDbSchema.extend({
  sachbearbeiter_email: z.string().nullable(),
});

// -- TypeScript-Interfaces --

export type Verlaengerung = z.infer<typeof VerlaengerungDbSchema>;
export type VerlaengerungMitEmail = z.infer<typeof VerlaengerungMitEmailSchema>;
