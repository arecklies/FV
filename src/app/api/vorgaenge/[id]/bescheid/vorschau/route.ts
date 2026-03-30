import { NextRequest } from "next/server";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { validateVorgangAccess } from "@/lib/api/route-helpers";
import { getBescheidEntwurf, renderVorschau } from "@/lib/services/bescheid";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/vorgaenge/[id]/bescheid/vorschau
 * HTML-Vorschau des aktuellen Bescheid-Entwurfs.
 * PROJ-6 US-3 AC-1, AC-3
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const serviceClient = createServiceRoleClient();

  const vorgangResult = await validateVorgangAccess(serviceClient, auth.tenantId, id);
  if (vorgangResult.error) return vorgangResult.error;

  // Bescheid laden
  const bescheidResult = await getBescheidEntwurf(serviceClient, auth.tenantId, id);
  if (bescheidResult.error || !bescheidResult.data) {
    return jsonResponse({ error: "Kein Bescheid-Entwurf vorhanden" }, 404);
  }

  const bescheidId = bescheidResult.data.id;

  const result = await renderVorschau(serviceClient, auth.tenantId, bescheidId);
  if (result.error) {
    return serverError("[PROJ-6] GET bescheid vorschau", result.error);
  }

  return jsonResponse({
    html: result.html,
    missing_platzhalter: result.missing,
    hat_offene_platzhalter: result.missing.length > 0,
  });
}
