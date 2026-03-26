import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, notFoundError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { getVorgang } from "@/lib/services/verfahren";
import { executeWorkflowAktion } from "@/lib/services/workflow";
import { WorkflowAktionSchema } from "@/lib/services/workflow/types";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/vorgaenge/[id]/workflow-aktion
 * Workflow-Schritt ausfuehren (ADR-011).
 * PROJ-3 US-7
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;

  let body: z.infer<typeof WorkflowAktionSchema>;
  try {
    body = WorkflowAktionSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      const fields: Record<string, string> = {};
      err.issues.forEach((issue) => {
        fields[issue.path.join(".")] = issue.message;
      });
      return validationError(fields);
    }
    return serverError("[PROJ-3] POST /api/vorgaenge/[id]/workflow-aktion: parse error", err);
  }

  const serviceClient = createServiceRoleClient();

  // Vorgang laden (fuer aktuellen Schritt + Verfahrensart)
  const vorgangResult = await getVorgang(serviceClient, auth.tenantId, id);
  if (vorgangResult.error || !vorgangResult.data) {
    return notFoundError("Vorgang nicht gefunden");
  }

  const vorgang = vorgangResult.data;
  const result = await executeWorkflowAktion(serviceClient, {
    tenantId: auth.tenantId,
    userId: auth.userId,
    userRole: auth.role,
    vorgangId: id,
    aktuellerSchrittId: vorgang.workflow_schritt_id,
    aktionId: body.aktion_id,
    begruendung: body.begruendung,
    verfahrensartId: vorgang.verfahrensart_id,
    bundesland: vorgang.bundesland,
  });

  if (result.error) {
    // Kontrollierte Business-Fehler: direkt an Client
    const businessErrors = [
      "Keine Workflow-Definition gefunden",
      "Aktueller Workflow-Schritt nicht gefunden",
      "Diese Aktion ist nicht verfügbar",
      "Ziel-Schritt nicht in Workflow-Definition",
    ];
    if (businessErrors.includes(result.error)) {
      return jsonResponse({ error: result.error }, 400);
    }
    return serverError("[PROJ-3] POST /api/vorgaenge/[id]/workflow-aktion failed", result.error);
  }

  return jsonResponse({
    message: "Workflow-Schritt ausgeführt",
    neuer_schritt: result.neuerSchrittId,
  });
}
