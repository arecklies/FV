import { z } from "zod";

/**
 * Bescheid-Types (PROJ-6, ADR-010)
 * Single Source of Truth fuer Bescheid- und Textbaustein-Interfaces.
 */

// -- Enums --

export const BESCHEIDTYPEN = [
  "genehmigung",
  "ablehnung",
  "vorbescheid",
  "teilgenehmigung",
] as const;

export const BescheidtypSchema = z.enum(BESCHEIDTYPEN);
export type Bescheidtyp = z.infer<typeof BescheidtypSchema>;

export const BESCHEID_STATUS = [
  "entwurf",
  "pdf_erzeugt",
  "freigegeben",
  "zugestellt",
] as const;

export const BescheidStatusSchema = z.enum(BESCHEID_STATUS);
export type BescheidStatus = z.infer<typeof BescheidStatusSchema>;

export const TEXTBAUSTEIN_KATEGORIEN = [
  "einleitung",
  "tenor",
  "nebenbestimmungen",
  "begruendung",
  "rechtsbehelfsbelehrung",
  "sonstiges",
] as const;

export const TextBausteinKategorieSchema = z.enum(TEXTBAUSTEIN_KATEGORIEN);
export type TextBausteinKategorie = z.infer<typeof TextBausteinKategorieSchema>;

// -- TextBaustein DB-Schema --

export const TextBausteinDbSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  titel: z.string(),
  kategorie: TextBausteinKategorieSchema,
  inhalt: z.string(),
  verfahrensarten: z.array(z.string()),
  bescheidtypen: z.array(z.string()),
  sortierung: z.number(),
  aktiv: z.boolean(),
  created_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type TextBaustein = z.infer<typeof TextBausteinDbSchema>;

// -- TextBaustein Create/Update --

export const CreateTextBausteinSchema = z.object({
  titel: z.string().min(1, "Titel ist Pflichtfeld").max(500),
  kategorie: TextBausteinKategorieSchema,
  inhalt: z.string().min(1, "Inhalt ist Pflichtfeld"),
  verfahrensarten: z.array(z.string()).optional().default([]),
  bescheidtypen: z.array(z.string()).optional().default([]),
  sortierung: z.number().int().min(0).optional().default(0),
});

export const UpdateTextBausteinSchema = z.object({
  titel: z.string().min(1).max(500).optional(),
  kategorie: TextBausteinKategorieSchema.optional(),
  inhalt: z.string().min(1).optional(),
  verfahrensarten: z.array(z.string()).optional(),
  bescheidtypen: z.array(z.string()).optional(),
  sortierung: z.number().int().min(0).optional(),
  aktiv: z.boolean().optional(),
});

// -- Bescheid DB-Schema --

/** JSONB-Eintrag in vorgang_bescheide.bausteine */
export const BausteinSnapshotSchema = z.object({
  baustein_id: z.string().uuid(),
  kategorie: TextBausteinKategorieSchema,
  titel: z.string(),
  inhalt: z.string(),
});

export type BausteinSnapshot = z.infer<typeof BausteinSnapshotSchema>;

/** JSONB-Eintrag in vorgang_bescheide.nebenbestimmungen */
export const NebenbestimmungSchema = z.object({
  baustein_id: z.string().uuid().optional(),
  text: z.string().min(1, "Nebenbestimmungstext ist Pflichtfeld"),
  sortierung: z.number().int().min(0),
});

export type Nebenbestimmung = z.infer<typeof NebenbestimmungSchema>;

export const BescheidDbSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  vorgang_id: z.string(),
  bescheidtyp: BescheidtypSchema,
  status: BescheidStatusSchema,
  bausteine: z.array(BausteinSnapshotSchema),
  nebenbestimmungen: z.array(NebenbestimmungSchema),
  platzhalter_werte: z.record(z.string(), z.string()),
  pdf_storage_path: z.string().nullable(),
  pdf_dokument_id: z.string().nullable(),
  erstellt_von: z.string().nullable(),
  freigegeben_von: z.string().nullable(),
  freigegeben_am: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  version: z.number(),
});

export type Bescheid = z.infer<typeof BescheidDbSchema>;

// -- Bescheid Create/Update --

export const CreateBescheidSchema = z.object({
  bescheidtyp: BescheidtypSchema,
});

export const UpdateBausteinListeSchema = z.object({
  bausteine: z.array(BausteinSnapshotSchema),
  version: z.number().int().positive("Version ist Pflichtfeld fuer Optimistic Locking"),
});

export const UpdateNebenbestimmungenSchema = z.object({
  nebenbestimmungen: z.array(NebenbestimmungSchema),
  version: z.number().int().positive("Version ist Pflichtfeld fuer Optimistic Locking"),
});

// -- Platzhalter-Katalog --

export interface PlatzhalterDefinition {
  beschreibung: string;
  beispiel: string;
}

export type PlatzhalterKatalog = Map<string, PlatzhalterDefinition>;

// -- ListBausteine-Filter --

export const ListBausteineFilterSchema = z.object({
  kategorie: TextBausteinKategorieSchema.optional(),
  verfahrensart: z.string().optional(),
  bescheidtyp: z.string().optional(),
  suche: z.string().optional(),
  nur_aktive: z.boolean().optional().default(true),
});

export type ListBausteineFilter = z.infer<typeof ListBausteineFilterSchema>;
