import { z } from "zod";

/**
 * Wiedervorlagen-Types (PROJ-53)
 * Single Source of Truth fuer Wiedervorlagen-Interfaces.
 *
 * Wiedervorlagen sind persoenliche Merker (keine gesetzlichen Fristen).
 * faellig_am ist date (taggenau), erledigt_am ist timestamptz.
 */

// -- Zod-Schemas (Validierung) --

/** POST /api/vorgaenge/[id]/wiedervorlagen -- Wiedervorlage anlegen */
export const CreateWiedervorlageSchema = z.object({
  faellig_am: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "faellig_am muss ein Datum im Format YYYY-MM-DD sein"),
  betreff: z
    .string()
    .min(1, "Betreff ist Pflichtfeld")
    .max(200, "Betreff darf maximal 200 Zeichen lang sein"),
  notiz: z.string().optional(),
});

/** PATCH /api/wiedervorlagen/[id] -- Wiedervorlage aktualisieren */
export const UpdateWiedervorlageSchema = z.object({
  erledigt_am: z
    .string()
    .datetime("Ungültiges Datum für erledigt_am")
    .nullable()
    .optional(),
  faellig_am: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "faellig_am muss ein Datum im Format YYYY-MM-DD sein")
    .optional(),
  betreff: z
    .string()
    .min(1, "Betreff darf nicht leer sein")
    .max(200, "Betreff darf maximal 200 Zeichen lang sein")
    .optional(),
  notiz: z.string().nullable().optional(),
});

/** DB-Ergebnis-Schema (B-003: Zod parsen statt Type Assertions) */
export const WiedervorlageDbSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  vorgang_id: z.string(),
  user_id: z.string(),
  faellig_am: z.string(),
  betreff: z.string(),
  notiz: z.string().nullable(),
  erledigt_am: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Wiedervorlage = z.infer<typeof WiedervorlageDbSchema>;

/** GET /api/wiedervorlagen/faellig -- Query-Parameter */
export const FaelligeQuerySchema = z.object({
  tage_voraus: z.coerce.number().int().min(1).max(30).optional().default(5),
});

/** Faellige Wiedervorlage mit Vorgang-Aktenzeichen (fuer Dashboard) */
export interface FaelligeWiedervorlage {
  wiedervorlage: Wiedervorlage;
  vorgang_aktenzeichen: string;
  vorgang_bezeichnung: string | null;
}
