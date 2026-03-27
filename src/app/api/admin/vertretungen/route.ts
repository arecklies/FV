import { requireAdmin, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { getAlleVertretungen } from "@/lib/services/stellvertreter";

/**
 * GET /api/admin/vertretungen
 * Alle Vertretungen im Mandanten (PROJ-35 US-3 AC-3.1).
 * Erfordert: tenant_admin
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!isAuthContext(auth)) return auth;

  const serviceClient = createServiceRoleClient();
  const result = await getAlleVertretungen(serviceClient, auth.tenantId);

  if (result.error) {
    return serverError("[PROJ-35] GET /api/admin/vertretungen failed", result.error);
  }

  return jsonResponse({ vertretungen: result.data });
}
