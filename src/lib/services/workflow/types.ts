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
}
