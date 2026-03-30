import { z } from "zod";
import { VorgangFristDbSchema, AmpelStatusSchema } from "@/lib/services/fristen/types";
import { VorgangListItemDbSchema } from "@/lib/services/verfahren/types";

/**
 * Tagesansicht-Types (PROJ-29)
 * Single Source of Truth fuer "Mein Tag"-Aggregation.
 */

// -- Fristen-Eintrag mit Vorgang-Referenz --

export const MeineFristSchema = z.object({
  frist: VorgangFristDbSchema,
  vorgang_aktenzeichen: z.string(),
  vorgang_bezeichnung: z.string().nullable(),
});
export type MeineFrist = z.infer<typeof MeineFristSchema>;

// -- Aufgabe (zugewiesener Vorgang, nicht in Endstatus) --

export const MeineAufgabeSchema = VorgangListItemDbSchema;
export type MeineAufgabe = z.infer<typeof MeineAufgabeSchema>;

// -- Kuerzlich bearbeiteter Vorgang --

export const KuerzlichBearbeitetSchema = z.object({
  vorgang_id: z.string(),
  aktenzeichen: z.string(),
  bezeichnung: z.string().nullable(),
  workflow_schritt_id: z.string(),
  ausgefuehrt_am: z.string(),
  schritt_id: z.string(),
});
export type KuerzlichBearbeitet = z.infer<typeof KuerzlichBearbeitetSchema>;

// -- Gesamt-Response --

export const MeinTagResponseSchema = z.object({
  fristen: z.array(MeineFristSchema),
  aufgaben: z.array(MeineAufgabeSchema),
  kuerzlich_bearbeitet: z.array(KuerzlichBearbeitetSchema),
});
export type MeinTagResponse = z.infer<typeof MeinTagResponseSchema>;
