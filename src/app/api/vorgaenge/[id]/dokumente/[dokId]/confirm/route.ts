import { NextRequest } from "next/server";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { validateUuidParam, validateVorgangAccess } from "@/lib/api/route-helpers";
import { bestaetigeUpload } from "@/lib/services/dokumente";

type RouteParams = { params: Promise<{ id: string; dokId: string }> };

/**
 * POST /api/vorgaenge/[id]/dokumente/[dokId]/confirm
 * Upload-Bestaetigung: Setzt Status auf 'active' und erstellt Version 1.
 * ADR-009 Schritt 5-6
 * PROJ-5 US-1 (AC-12)
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id, dokId } = await params;
  const serviceClient = createServiceRoleClient();

  const vorgangResult = await validateVorgangAccess(serviceClient, auth.tenantId, id);
  if (vorgangResult.error) return vorgangResult.error;

  const dokIdResult = validateUuidParam(dokId, "Dokument-ID");
  if (dokIdResult.error) return dokIdResult.error;

  const result = await bestaetigeUpload(serviceClient, auth.tenantId, dokIdResult.id);
  if (result.error) {
    return serverError("[PROJ-5] POST /api/vorgaenge/[id]/dokumente/[dokId]/confirm failed", result.error);
  }

  return jsonResponse({ dokument: result.data });
}
