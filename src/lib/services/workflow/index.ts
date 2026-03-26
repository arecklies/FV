import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/services/audit";
import type { UserRole } from "@/lib/api/auth";
import { hasMinRole } from "@/lib/api/auth";
import type { WorkflowDefinition, WorkflowSchritt, WorkflowSchrittHistorie } from "./types";

/**
 * WorkflowService (ADR-011, ADR-003)
 *
 * Datengetriebene State Machine. Laedt Workflow-Definitionen aus config_workflows
 * und validiert/ausfuehrt Schritt-Uebergaenge.
 */

export async function getWorkflowDefinition(
  serviceClient: SupabaseClient,
  verfahrensartId: string,
  bundesland: string
): Promise<WorkflowDefinition | null> {
  const { data } = await serviceClient
    .from("config_workflows")
    .select("definition")
    .eq("verfahrensart_id", verfahrensartId)
    .eq("bundesland", bundesland)
    .eq("aktiv", true)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;
  return data.definition as WorkflowDefinition;
}

export function getSchritt(
  definition: WorkflowDefinition,
  schrittId: string
): WorkflowSchritt | undefined {
  return definition.schritte.find((s) => s.id === schrittId);
}

export function getVerfuegbareAktionen(
  definition: WorkflowDefinition,
  aktuellerSchrittId: string,
  userRole: UserRole
): { aktionen: WorkflowSchritt["aktionen"]; schritt: WorkflowSchritt | null } {
  const schritt = getSchritt(definition, aktuellerSchrittId);
  if (!schritt) return { aktionen: [], schritt: null };

  // Freigabe-Schritte: Nur mit Mindestrolle ausfuehrbar
  if (schritt.typ === "freigabe" && schritt.minRolle) {
    if (!hasMinRole(userRole, schritt.minRolle as UserRole)) {
      return { aktionen: [], schritt };
    }
  }

  return { aktionen: schritt.aktionen, schritt };
}

interface ExecuteAktionParams {
  tenantId: string;
  userId: string;
  userRole: UserRole;
  vorgangId: string;
  aktuellerSchrittId: string;
  aktionId: string;
  begruendung?: string;
  verfahrensartId: string;
  bundesland: string;
}

export async function executeWorkflowAktion(
  serviceClient: SupabaseClient,
  params: ExecuteAktionParams
): Promise<{ neuerSchrittId: string | null; error: string | null }> {
  // 1. Workflow-Definition laden
  const definition = await getWorkflowDefinition(
    serviceClient,
    params.verfahrensartId,
    params.bundesland
  );

  if (!definition) {
    return { neuerSchrittId: null, error: "Keine Workflow-Definition gefunden" };
  }

  // 2. Aktuellen Schritt und Aktionen pruefen
  const { aktionen, schritt } = getVerfuegbareAktionen(
    definition,
    params.aktuellerSchrittId,
    params.userRole
  );

  if (!schritt) {
    return { neuerSchrittId: null, error: "Aktueller Workflow-Schritt nicht gefunden" };
  }

  // 3. Aktion finden
  const aktion = aktionen.find((a) => a.id === params.aktionId);
  if (!aktion) {
    return { neuerSchrittId: null, error: "Diese Aktion ist nicht verfügbar" };
  }

  // 4. Ziel-Schritt validieren
  const zielSchritt = getSchritt(definition, aktion.ziel);
  if (!zielSchritt) {
    return { neuerSchrittId: null, error: "Ziel-Schritt nicht in Workflow-Definition" };
  }

  // 5. Vorgang aktualisieren
  const { error: updateError } = await serviceClient
    .from("vorgaenge")
    .update({ workflow_schritt_id: aktion.ziel })
    .eq("id", params.vorgangId)
    .eq("tenant_id", params.tenantId);

  if (updateError) {
    return { neuerSchrittId: null, error: updateError.message };
  }

  // 6. Workflow-Schritt protokollieren
  await serviceClient.from("vorgang_workflow_schritte").insert({
    tenant_id: params.tenantId,
    vorgang_id: params.vorgangId,
    schritt_id: aktion.ziel,
    aktion_id: params.aktionId,
    begruendung: params.begruendung ?? null,
    uebersprungen: false,
    ausgefuehrt_von: params.userId,
  });

  // 7. Audit-Log
  await writeAuditLog({
    tenantId: params.tenantId,
    userId: params.userId,
    action: "vorgang.workflow_schritt",
    resourceType: "vorgang",
    resourceId: params.vorgangId,
    payload: {
      von: params.aktuellerSchrittId,
      nach: aktion.ziel,
      aktion: params.aktionId,
    },
  });

  return { neuerSchrittId: aktion.ziel, error: null };
}

export async function getWorkflowHistorie(
  serviceClient: SupabaseClient,
  tenantId: string,
  vorgangId: string
): Promise<{ data: WorkflowSchrittHistorie[]; error: string | null }> {
  const { data, error } = await serviceClient
    .from("vorgang_workflow_schritte")
    .select("id, vorgang_id, schritt_id, aktion_id, begruendung, uebersprungen, ausgefuehrt_von, ausgefuehrt_am")
    .eq("tenant_id", tenantId)
    .eq("vorgang_id", vorgangId)
    .order("ausgefuehrt_am", { ascending: true })
    .limit(200);

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as WorkflowSchrittHistorie[], error: null };
}
