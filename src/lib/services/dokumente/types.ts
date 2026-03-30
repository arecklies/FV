import { z } from "zod";

/**
 * Dokumente-Types (ADR-009, PROJ-5)
 * Single Source of Truth fuer Dokument-bezogene Schemas und Typen.
 */

// -- Erlaubte MIME-Types (FA-4, ADR-009) --

/**
 * Map: Dateiendung → MIME-Type.
 * Wird fuer Content-Type-Validierung und Dateiendung-Pruefung verwendet.
 */
export const ERLAUBTE_MIME_TYPES = new Map<string, string>([
  ["pdf", "application/pdf"],
  ["tiff", "image/tiff"],
  ["tif", "image/tiff"],
  ["jpeg", "image/jpeg"],
  ["jpg", "image/jpeg"],
  ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ["xls", "application/vnd.ms-excel"],
  ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ["dwg", "application/acad"],
  ["dxf", "application/dxf"],
]);

/**
 * Alle erlaubten MIME-Type-Werte (fuer Zod-Validierung).
 */
export const ERLAUBTE_MIME_TYPE_WERTE = [...new Set(ERLAUBTE_MIME_TYPES.values())];

// -- Dokument-Kategorien (FA-1) --

export const DOKUMENT_KATEGORIEN = [
  "antragsunterlagen",
  "plaene",
  "gutachten",
  "bescheide",
  "schriftverkehr",
  "sonstiges",
] as const;

export type DokumentKategorie = (typeof DOKUMENT_KATEGORIEN)[number];

// -- Zod-Schemas (Validierung + Parsing) --

/** Schema fuer ein Dokument aus der DB (vorgang_dokumente). */
export const DokumentDbSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  vorgang_id: z.string().uuid(),
  dateiname: z.string(),
  kategorie: z.enum(DOKUMENT_KATEGORIEN),
  beschreibung: z.string().nullable(),
  schlagwoerter: z.array(z.string()),
  aktuelle_version: z.number().int().positive(),
  status: z.enum(["uploading", "active", "failed"]),
  uploaded_by: z.string().uuid(),
  uploaded_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Dokument = z.infer<typeof DokumentDbSchema>;

/** Schema fuer eine Dokumentversion aus der DB (vorgang_dokument_versionen). */
export const DokumentVersionDbSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  dokument_id: z.string().uuid(),
  version: z.number().int().positive(),
  dateiname: z.string(),
  mime_type: z.string(),
  dateigroesse: z.number().int().nonnegative(),
  storage_pfad: z.string(),
  uploaded_by: z.string().uuid(),
  uploaded_at: z.string(),
  ocr_text: z.string().nullable(),
  created_at: z.string(),
});

export type DokumentVersion = z.infer<typeof DokumentVersionDbSchema>;

/** Schema fuer Upload-Initiierung (POST /dokumente). */
export const CreateDokumentSchema = z.object({
  dateiname: z.string().min(1, "Dateiname ist Pflichtfeld"),
  mime_type: z.string().refine(
    (val) => ERLAUBTE_MIME_TYPE_WERTE.includes(val),
    { message: "Nicht unterstützter Dateityp" }
  ),
  dateigroesse: z.number().int().positive("Dateigröße muss positiv sein"),
  kategorie: z.enum(DOKUMENT_KATEGORIEN).default("sonstiges"),
  beschreibung: z.string().optional(),
  schlagwoerter: z.array(z.string()).optional(),
});

export type CreateDokumentInput = z.infer<typeof CreateDokumentSchema>;

/** Schema fuer Metadaten-Update (PATCH /dokumente/[dokId]). */
export const UpdateDokumentSchema = z.object({
  kategorie: z.enum(DOKUMENT_KATEGORIEN).optional(),
  beschreibung: z.string().optional(),
  schlagwoerter: z.array(z.string()).optional(),
});

export type UpdateDokumentInput = z.infer<typeof UpdateDokumentSchema>;

/** Schema fuer neue Version (POST /dokumente/[dokId]/versionen). */
export const CreateVersionSchema = z.object({
  dateiname: z.string().min(1, "Dateiname ist Pflichtfeld"),
  mime_type: z.string().refine(
    (val) => ERLAUBTE_MIME_TYPE_WERTE.includes(val),
    { message: "Nicht unterstützter Dateityp" }
  ),
  dateigroesse: z.number().int().positive("Dateigröße muss positiv sein"),
});

export type CreateVersionInput = z.infer<typeof CreateVersionSchema>;
