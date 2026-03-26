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
  sortierung: z.enum(["eingangsdatum", "aktenzeichen", "workflow_schritt_id"]).optional(),
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

// -- TypeScript-Interfaces --

export interface Vorgang {
  id: string;
  tenant_id: string;
  aktenzeichen: string;
  verfahrensart_id: string;
  bundesland: string;
  bauherr_name: string;
  bauherr_anschrift: string | null;
  bauherr_telefon: string | null;
  bauherr_email: string | null;
  grundstueck_adresse: string | null;
  grundstueck_flurstueck: string | null;
  grundstueck_gemarkung: string | null;
  bezeichnung: string | null;
  workflow_schritt_id: string;
  zustaendiger_user_id: string | null;
  eingangsdatum: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
  extra_felder: Record<string, unknown>;
}

export interface VorgangListItem {
  id: string;
  aktenzeichen: string;
  bauherr_name: string;
  grundstueck_adresse: string | null;
  bezeichnung: string | null;
  workflow_schritt_id: string;
  zustaendiger_user_id: string | null;
  eingangsdatum: string;
  verfahrensart_id: string;
}

export interface VorgangKommentar {
  id: string;
  vorgang_id: string;
  autor_user_id: string;
  inhalt: string;
  created_at: string;
}

export interface Verfahrensart {
  id: string;
  bundesland: string;
  kuerzel: string;
  bezeichnung: string;
  kategorie: string;
  sortierung: number;
  rechtsgrundlage: string | null;
}
