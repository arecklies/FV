import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, notFoundError, conflictError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { getVorgang, updateVorgang, softDeleteVorgang } from "@/lib/services/verfahren";
import { getWorkflowDefinition, getSchritt, getVerfuegbareAktionen } from "@/lib/services/workflow";
import { UpdateVorgangSchema, UuidParamSchema } from "@/lib/services/verfahren/types";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/vorgaenge/[id]
 * Vorgang-Detail mit aktuellem Workflow-Schritt und verfuegbaren Aktionen.
 * PROJ-3 US-7 (gefuehrter Prozess)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Vorgang-ID" });

  const serviceClient = createServiceRoleClient();

  const result = await getVorgang(serviceClient, auth.tenantId, id);
  if (result.error || !result.data) {
    return notFoundError("Vorgang nicht gefunden");
  }

  const vorgang = result.data;

  // Workflow-Info laden (ADR-011)
  const definition = await getWorkflowDefinition(
    serviceClient,
    vorgang.verfahrensart_id,
    vorgang.bundesland
  );

  let workflowInfo = null;
  if (definition) {
    const schritt = getSchritt(definition, vorgang.workflow_schritt_id);
    const { aktionen } = getVerfuegbareAktionen(definition, vorgang.workflow_schritt_id, auth.role);
    workflowInfo = {
      schritt,
      verfuegbare_aktionen: aktionen,
      alle_schritte: definition.schritte.map((s) => ({ id: s.id, label: s.label, typ: s.typ })),
    };
  }

  return jsonResponse({ vorgang, workflow: workflowInfo });
}

/**
 * PATCH /api/vorgaenge/[id]
 * Vorgang aktualisieren mit Optimistic Locking (version).
 * PROJ-3 US-5
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Vorgang-ID" });

  let body: z.infer<typeof UpdateVorgangSchema>;
  try {
    body = UpdateVorgangSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      const fields: Record<string, string> = {};
      err.issues.forEach((issue) => {
        fields[issue.path.join(".")] = issue.message;
      });
      return validationError(fields);
    }
    return serverError("[PROJ-3] PATCH /api/vorgaenge/[id]: parse error", err);
  }

  const { version, ...updates } = body;
  const serviceClient = createServiceRoleClient();

  const result = await updateVorgang(serviceClient, {
    tenantId: auth.tenantId,
    userId: auth.userId,
    vorgangId: id,
    version,
    updates,
  });

  if (result.conflict) {
    return conflictError(result.error ?? "Vorgang wurde zwischenzeitlich geändert.");
  }
  if (result.error) {
    return serverError("[PROJ-3] PATCH /api/vorgaenge/[id] failed", result.error);
  }

  return jsonResponse({ vorgang: result.data });
}

/**
 * DELETE /api/vorgaenge/[id]
 * Soft-Delete (setzt deleted_at).
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Vorgang-ID" });

  const serviceClient = createServiceRoleClient();

  const result = await softDeleteVorgang(serviceClient, auth.tenantId, auth.userId, id);
  if (result.error) {
    return serverError("[PROJ-3] DELETE /api/vorgaenge/[id] failed", result.error);
  }

  return jsonResponse({ message: "Vorgang gelöscht" });
}
