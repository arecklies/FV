import { requireAdmin, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, notFoundError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { deleteVertretung } from "@/lib/services/stellvertreter";
import { UuidParamSchema } from "@/lib/services/verfahren/types";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * DELETE /api/admin/vertretungen/[id]
 * Vertretung als Admin loeschen (PROJ-35 US-3 AC-3.2).
 * Erfordert: tenant_admin
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireAdmin();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Vertretungs-ID" });

  const serviceClient = createServiceRoleClient();

  const result = await deleteVertretung(serviceClient, {
    tenantId: auth.tenantId,
    vertretungId: id,
    auditUserId: auth.userId,
    auditAction: "vertretung.admin_entfernt",
  });

  if (result.error) {
    if (result.error === "Vertretung nicht gefunden") {
      return notFoundError(result.error);
    }
    return serverError("[PROJ-35] DELETE /api/admin/vertretungen/[id] failed", result.error);
  }

  return jsonResponse({ message: "Vertretung entfernt" });
}
