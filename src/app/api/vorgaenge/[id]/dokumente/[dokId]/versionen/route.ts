import { NextRequest } from "next/server";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { validateUuidParam, validateVorgangAccess, parseJsonBody } from "@/lib/api/route-helpers";
import { CreateVersionSchema } from "@/lib/services/dokumente/types";
import { holeDokumentMitVersionen, erstelleVersion } from "@/lib/services/dokumente";

type RouteParams = { params: Promise<{ id: string; dokId: string }> };

/**
 * GET /api/vorgaenge/[id]/dokumente/[dokId]/versionen
 * Versionshistorie eines Dokuments abrufen.
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
    return serverError("[PROJ-5] GET /api/vorgaenge/[id]/dokumente/[dokId]/versionen failed", result.error);
  }

  return jsonResponse({ versionen: result.data?.versionen ?? [] });
}

/**
 * POST /api/vorgaenge/[id]/dokumente/[dokId]/versionen
 * Neue Version eines bestehenden Dokuments hochladen.
 * PROJ-5 US-2 (AC-1, AC-2, AC-5, AC-6)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id, dokId } = await params;
  const serviceClient = createServiceRoleClient();

  const vorgangResult = await validateVorgangAccess(serviceClient, auth.tenantId, id);
  if (vorgangResult.error) return vorgangResult.error;

  const dokIdResult = validateUuidParam(dokId, "Dokument-ID");
  if (dokIdResult.error) return dokIdResult.error;

  const bodyResult = await parseJsonBody(request, CreateVersionSchema, "[PROJ-5] POST /api/vorgaenge/[id]/dokumente/[dokId]/versionen");
  if (bodyResult.error) return bodyResult.error;

  const result = await erstelleVersion(serviceClient, auth.tenantId, auth.userId, dokIdResult.id, bodyResult.data);
  if (result.error) {
    return serverError("[PROJ-5] POST /api/vorgaenge/[id]/dokumente/[dokId]/versionen failed", result.error);
  }

  return jsonResponse(result.data, 201);
}
