import { z } from "zod";

/**
 * Workflow-Types (ADR-011)
 * Typen fuer die datengetriebene State Machine.
 */

export const WorkflowAktionSchema = z.object({
  aktion_id: z.string().min(1, "Aktion ist Pflichtfeld"),
  begruendung: z.string().optional(),
});

export interface WorkflowAktion {
  id: string;
  label: string;
  ziel: string;
  zurueckweisung?: boolean;
}

export interface WorkflowSchritt {
  id: string;
  label: string;
  typ: "automatisch" | "manuell" | "freigabe" | "endstatus";
  naechsteSchritte: string[];
  aktionen: WorkflowAktion[];
  frist?: string;
  hinweis?: string;
  checkliste?: string[];
  minRolle?: string;
}

export interface WorkflowDefinition {
  name: string;
  version: number;
  initialStatus: string;
  schritte: WorkflowSchritt[];
}

export interface WorkflowSchrittHistorie {
  id: string;
  vorgang_id: string;
  schritt_id: string;
  aktion_id: string | null;
  begruendung: string | null;
  uebersprungen: boolean;
  ausgefuehrt_von: string | null;
  ausgefuehrt_am: string;
  /** PROJ-35: User-ID des vertretenen Referatsleiters bei Stellvertreter-Freigabe */
  vertretung_fuer: string | null;
}

/** Zod-Schemas fuer DB-Ergebnisse (B-19-03: statt Type Assertions) */

const WorkflowAktionDbSchema = z.object({
  id: z.string(),
  label: z.string(),
  ziel: z.string(),
  zurueckweisung: z.boolean().optional(),
});

const WorkflowSchrittDbSchema = z.object({
  id: z.string(),
  label: z.string(),
  typ: z.enum(["automatisch", "manuell", "freigabe", "endstatus"]),
  naechsteSchritte: z.array(z.string()),
  aktionen: z.array(WorkflowAktionDbSchema),
  frist: z.string().optional(),
  hinweis: z.string().optional(),
  checkliste: z.array(z.string()).optional(),
  minRolle: z.string().optional(),
});

export const WorkflowDefinitionDbSchema = z.object({
  name: z.string(),
  version: z.number(),
  initialStatus: z.string(),
  schritte: z.array(WorkflowSchrittDbSchema),
});

export const WorkflowSchrittHistorieDbSchema = z.object({
  id: z.string(),
  vorgang_id: z.string(),
  schritt_id: z.string(),
  aktion_id: z.string().nullable(),
  begruendung: z.string().nullable(),
  uebersprungen: z.boolean(),
  ausgefuehrt_von: z.string().nullable(),
  ausgefuehrt_am: z.string(),
  /** PROJ-35: Vertretung */
  vertretung_fuer: z.string().nullable().default(null),
});

/** PROJ-47 US-1 AC-5: Historie mit aufgelöster E-Mail */
export const WorkflowSchrittHistorieMitEmailSchema = WorkflowSchrittHistorieDbSchema.extend({
  ausgefuehrt_von_email: z.string().nullable(),
});

export type WorkflowSchrittHistorieMitEmail = z.infer<typeof WorkflowSchrittHistorieMitEmailSchema>;
