import { NextRequest } from "next/server";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { validateUuidParam, validateVorgangAccess, parseJsonBody } from "@/lib/api/route-helpers";
import { UpdateDokumentSchema } from "@/lib/services/dokumente/types";
import { aktualisiereMetadaten, holeDokumentMitVersionen } from "@/lib/services/dokumente";

type RouteParams = { params: Promise<{ id: string; dokId: string }> };

/**
 * GET /api/vorgaenge/[id]/dokumente/[dokId]
 * Einzelnes Dokument mit allen Versionen laden.
 * PROJ-5 US-2 (AC-3)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id, dokId } = await params;
  const serviceClient = createServiceRoleClient();

  const vorgangResult = await validateVorgangAccess(serviceClient, auth.tenantId, id);
  if (vorgangResult.error) return vorgangResult.error;

  const dokIdResult = validateUuidParam(dokId, "Dokument-ID");
  if (dokIdResult.error) return dokIdResult.error;

  const result = await holeDokumentMitVersionen(serviceClient, auth.tenantId, dokIdResult.id);
  if (result.error) {
    return serverError("[PROJ-5] GET /api/vorgaenge/[id]/dokumente/[dokId] failed", result.error);
  }

  return jsonResponse(result.data);
}

/**
 * PATCH /api/vorgaenge/[id]/dokumente/[dokId]
 * Metadaten eines Dokuments aktualisieren (Kategorie, Beschreibung, Schlagwoerter).
 * PROJ-5 US-2 (AC-7)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id, dokId } = await params;
  const serviceClient = createServiceRoleClient();

  const vorgangResult = await validateVorgangAccess(serviceClient, auth.tenantId, id);
  if (vorgangResult.error) return vorgangResult.error;

  const dokIdResult = validateUuidParam(dokId, "Dokument-ID");
  if (dokIdResult.error) return dokIdResult.error;

  const bodyResult = await parseJsonBody(request, UpdateDokumentSchema, "[PROJ-5] PATCH /api/vorgaenge/[id]/dokumente/[dokId]");
  if (bodyResult.error) return bodyResult.error;

  const result = await aktualisiereMetadaten(serviceClient, auth.tenantId, dokIdResult.id, bodyResult.data);
  if (result.error) {
    return serverError("[PROJ-5] PATCH /api/vorgaenge/[id]/dokumente/[dokId] failed", result.error);
  }

  return jsonResponse({ dokument: result.data });
}
