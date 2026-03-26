import { NextRequest } from "next/server";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { listVerfahrensarten } from "@/lib/services/verfahren";

/**
 * GET /api/verfahrensarten
 * Verfahrensarten fuer das Bundesland des Mandanten auflisten.
 * PROJ-3 US-1 AC-1 (Dropdown bei Vorgangsanlage)
 */
export async function GET(_request: NextRequest) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const serviceClient = createServiceRoleClient();

  // Bundesland aus Tenant-Einstellungen laden
  const { data: tenant } = await serviceClient
    .from("tenants")
    .select("bundesland")
    .eq("id", auth.tenantId)
    .single();

  if (!tenant) {
    return serverError("[PROJ-3] GET /api/verfahrensarten: Tenant nicht gefunden", null);
  }

  const result = await listVerfahrensarten(serviceClient, tenant.bundesland);
  if (result.error) {
    return serverError("[PROJ-3] GET /api/verfahrensarten failed", result.error);
  }

  return jsonResponse({ verfahrensarten: result.data });
}
