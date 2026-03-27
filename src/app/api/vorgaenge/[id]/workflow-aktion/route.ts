import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthContext, hasMinRole } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, notFoundError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { getVorgang } from "@/lib/services/verfahren";
import { executeWorkflowAktion, getWorkflowDefinition, getSchritt } from "@/lib/services/workflow";
import { WorkflowAktionSchema } from "@/lib/services/workflow/types";
import { UuidParamSchema } from "@/lib/services/verfahren/types";
import { getVertreteneReferatsleiterIds } from "@/lib/services/stellvertreter";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/vorgaenge/[id]/workflow-aktion
 * Workflow-Schritt ausfuehren (ADR-011).
 * PROJ-3 US-7, PROJ-19 (Auto-Frist bei Schritt-Wechsel)
 * PROJ-35: Stellvertreter-Freigabe (ADR-013)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Vorgang-ID" });

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

  // PROJ-35: Stellvertreter-Kontext ermitteln bei Freigabe-Schritten
  let vertreteneIds: string[] | undefined;
  let vertretungFuerId: string | undefined;
  let vertretungFuerName: string | undefined;

  const definition = await getWorkflowDefinition(
    serviceClient,
    vorgang.verfahrensart_id,
    vorgang.bundesland
  );

  if (definition) {
    const schritt = getSchritt(definition, vorgang.workflow_schritt_id);
    if (schritt?.typ === "freigabe" && schritt.minRolle) {
      // Nur Stellvertreter-Lookup wenn User nicht selbst berechtigt ist
      if (!hasMinRole(auth.role, schritt.minRolle as typeof auth.role)) {
        vertreteneIds = await getVertreteneReferatsleiterIds(
          serviceClient,
          auth.tenantId,
          auth.userId
        );
        if (vertreteneIds.length > 0) {
          // Modell A (ADR-013): Erster passender Referatsleiter als Vertretungs-Kontext
          vertretungFuerId = vertreteneIds[0];
          // E-Mail als Name laden (fuer Audit-Trail)
          const { data: vertretenerMember } = await serviceClient
            .from("tenant_members")
            .select("user_id")
            .eq("tenant_id", auth.tenantId)
            .eq("user_id", vertretungFuerId)
            .limit(1)
            .single();
          if (vertretenerMember) {
            const { data: authData } = await serviceClient.auth.admin.getUserById(vertretungFuerId);
            vertretungFuerName = authData?.user?.email ?? undefined;
          }
        }
      }
    }
  }

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
    vertreteneIds,
    vertretungFuerId,
    vertretungFuerName,
  });

  if (result.error) {
    // Kontrollierte Business-Fehler: direkt an Client
    const businessErrors = [
      "Keine Workflow-Definition gefunden",
      "Aktueller Workflow-Schritt nicht gefunden",
      "Diese Aktion ist nicht verfügbar",
      "Ziel-Schritt nicht in Workflow-Definition",
      "Begründung ist Pflicht bei Zurückweisung (mindestens 10 Zeichen)",
    ];
    if (businessErrors.includes(result.error)) {
      return jsonResponse({ error: result.error }, 400);
    }
    return serverError("[PROJ-3] POST /api/vorgaenge/[id]/workflow-aktion failed", result.error);
  }

  return jsonResponse({
    message: "Workflow-Schritt ausgeführt",
    neuer_schritt: result.neuerSchrittId,
    frist_erstellt: result.fristErstellt ?? null,
    vertretung_fuer: vertretungFuerId ?? null,
  });
}
