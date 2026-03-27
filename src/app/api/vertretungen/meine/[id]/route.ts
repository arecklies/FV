import { requireReferatsleiter, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, notFoundError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { deleteVertretung } from "@/lib/services/stellvertreter";
import { UuidParamSchema } from "@/lib/services/verfahren/types";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * DELETE /api/vertretungen/meine/[id]
 * Eigenen Stellvertreter entfernen (PROJ-35 US-1 AC-1.8).
 * Erfordert: referatsleiter
 * Prueft: Vertretung gehoert dem aufrufenden User (vertretener_id = auth.userId).
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireReferatsleiter();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Vertretungs-ID" });

  const serviceClient = createServiceRoleClient();

  // Pruefe ob Vertretung dem aufrufenden User gehoert
  const { data: existing } = await serviceClient
    .from("freigabe_stellvertreter")
    .select("id, vertretener_id")
    .eq("id", id)
    .eq("tenant_id", auth.tenantId)
    .limit(1)
    .single();

  if (!existing) {
    return notFoundError("Vertretung nicht gefunden");
  }

  // AC-3.4: Referatsleiter darf nur eigene Vertretungen loeschen
  if (existing.vertretener_id !== auth.userId) {
    return notFoundError("Vertretung nicht gefunden");
  }

  const result = await deleteVertretung(serviceClient, {
    tenantId: auth.tenantId,
    vertretungId: id,
    auditUserId: auth.userId,
    auditAction: "vertretung.entfernt",
  });

  if (result.error) {
    return serverError("[PROJ-35] DELETE /api/vertretungen/meine/[id] failed", result.error);
  }

  return jsonResponse({ message: "Vertretung entfernt" });
}
