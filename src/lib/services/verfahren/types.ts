import { z } from "zod";

/**
 * Verfahren-Types (ADR-012, PROJ-3)
 * Single Source of Truth fuer Vorgang-bezogene Interfaces.
 */

// -- Zod-Schemas (Validierung) --

export const CreateVorgangSchema = z.object({
  verfahrensart_id: z.string().uuid("Ungültige Verfahrensart-ID"),
  bauherr_name: z.string().min(1, "Bauherr (Name) ist Pflichtfeld"),
  bauherr_anschrift: z.string().optional(),
  bauherr_telefon: z.string().optional(),
  bauherr_email: z.string().email("Ungültige E-Mail-Adresse").optional().or(z.literal("")),
  grundstueck_adresse: z.string().optional(),
  grundstueck_flurstueck: z.string().optional(),
  grundstueck_gemarkung: z.string().optional(),
  bezeichnung: z.string().optional(),
  extra_felder: z.record(z.string(), z.unknown()).optional(),
}).refine(
  (data) => data.grundstueck_adresse || data.grundstueck_flurstueck,
  { message: "Mindestens Adresse oder Flurstück ist Pflicht", path: ["grundstueck_adresse"] }
);

export const UpdateVorgangSchema = z.object({
  bauherr_name: z.string().min(1).optional(),
  bauherr_anschrift: z.string().optional(),
  bauherr_telefon: z.string().optional(),
  bauherr_email: z.string().email().optional().or(z.literal("")),
  grundstueck_adresse: z.string().optional(),
  grundstueck_flurstueck: z.string().optional(),
  grundstueck_gemarkung: z.string().optional(),
  bezeichnung: z.string().optional(),
  extra_felder: z.record(z.string(), z.unknown()).optional(),
  version: z.number().int().positive("Version ist Pflichtfeld für Optimistic Locking"),
});

export const ListVorgaengeQuerySchema = z.object({
  status: z.string().optional(),
  verfahrensart_id: z.string().uuid().optional(),
  zustaendiger_user_id: z.string().uuid().optional(),
  suche: z.string().optional(),
  sortierung: z.enum(["eingangsdatum", "aktenzeichen", "workflow_schritt_id", "frist_status"]).optional(),
  richtung: z.enum(["asc", "desc"]).optional(),
  seite: z.coerce.number().int().positive().optional().default(1),
  pro_seite: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export const ZuweisenSchema = z.object({
  zustaendiger_user_id: z.string().uuid("Ungültige Benutzer-ID"),
});

export const KommentarSchema = z.object({
  inhalt: z.string().min(1, "Kommentar darf nicht leer sein").max(10000),
});

/** UUID-Validierung fuer [id] Path-Parameter (B-004) */
export const UuidParamSchema = z.string().uuid("Ungültige ID");

// -- Zod-Schemas fuer DB-Ergebnisse (B-003: statt Type Assertions) --

export const VerfahrensartDbSchema = z.object({
  id: z.string(),
  bundesland: z.string(),
  kuerzel: z.string(),
  bezeichnung: z.string(),
  kategorie: z.string(),
  sortierung: z.number(),
  rechtsgrundlage: z.string().nullable(),
});

export const VorgangDbSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  aktenzeichen: z.string(),
  verfahrensart_id: z.string(),
  bundesland: z.string(),
  bauherr_name: z.string(),
  bauherr_anschrift: z.string().nullable(),
  bauherr_telefon: z.string().nullable(),
  bauherr_email: z.string().nullable(),
  grundstueck_adresse: z.string().nullable(),
  grundstueck_flurstueck: z.string().nullable(),
  grundstueck_gemarkung: z.string().nullable(),
  bezeichnung: z.string().nullable(),
  workflow_schritt_id: z.string(),
  zustaendiger_user_id: z.string().nullable(),
  eingangsdatum: z.string(),
  created_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
  version: z.number(),
  extra_felder: z.record(z.string(), z.unknown()),
});

export const VorgangListItemDbSchema = z.object({
  id: z.string(),
  aktenzeichen: z.string(),
  bauherr_name: z.string(),
  grundstueck_adresse: z.string().nullable(),
  bezeichnung: z.string().nullable(),
  workflow_schritt_id: z.string(),
  zustaendiger_user_id: z.string().nullable(),
  eingangsdatum: z.string(),
  verfahrensart_id: z.string(),
  frist_status: z.string().nullable().optional(),
});

export const VorgangKommentarDbSchema = z.object({
  id: z.string(),
  vorgang_id: z.string(),
  autor_user_id: z.string(),
  inhalt: z.string(),
  created_at: z.string(),
});

/** PROJ-47 US-1: Kommentar mit aufgelöster E-Mail-Adresse */
export const VorgangKommentarMitEmailSchema = VorgangKommentarDbSchema.extend({
  autor_email: z.string().nullable(),
});

// -- TypeScript-Interfaces (abgeleitet aus Zod-Schemas) --

export type Vorgang = z.infer<typeof VorgangDbSchema>;
export type VorgangListItem = z.infer<typeof VorgangListItemDbSchema>;
export type VorgangKommentar = z.infer<typeof VorgangKommentarDbSchema>;
export type VorgangKommentarMitEmail = z.infer<typeof VorgangKommentarMitEmailSchema>;
export type Verfahrensart = z.infer<typeof VerfahrensartDbSchema>;

/** PROJ-47 US-3: Statistik-Aggregation über alle Vorgänge */
export interface VorgaengeStatistik {
  gesamt: number;
  gefaehrdet: number;
  ueberfaellig: number;
  im_zeitplan: number;
}

