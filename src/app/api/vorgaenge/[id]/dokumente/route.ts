import { NextRequest } from "next/server";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { validateUuidParam, validateVorgangAccess, parseJsonBody } from "@/lib/api/route-helpers";
import { CreateDokumentSchema } from "@/lib/services/dokumente/types";
import { erstelleDokument, holeDokumente } from "@/lib/services/dokumente";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/vorgaenge/[id]/dokumente
 * Alle aktiven Dokumente eines Vorgangs auflisten.
 * PROJ-5 US-1 (AC-8, AC-9)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const serviceClient = createServiceRoleClient();

  const vorgangResult = await validateVorgangAccess(serviceClient, auth.tenantId, id);
  if (vorgangResult.error) return vorgangResult.error;

  const result = await holeDokumente(serviceClient, auth.tenantId, id);
  if (result.error) {
    return serverError("[PROJ-5] GET /api/vorgaenge/[id]/dokumente failed", result.error);
  }

  return jsonResponse({ dokumente: result.data });
}

/**
 * POST /api/vorgaenge/[id]/dokumente
 * Upload-Initiierung: Erstellt Dokument-Eintrag und gibt signierte Upload-URL zurueck.
 * PROJ-5 US-1 (AC-1 bis AC-7), ADR-009 Schritt 1-3
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const serviceClient = createServiceRoleClient();

  const vorgangResult = await validateVorgangAccess(serviceClient, auth.tenantId, id);
  if (vorgangResult.error) return vorgangResult.error;

  const bodyResult = await parseJsonBody(request, CreateDokumentSchema, "[PROJ-5] POST /api/vorgaenge/[id]/dokumente");
  if (bodyResult.error) return bodyResult.error;

  const result = await erstelleDokument(serviceClient, auth.tenantId, auth.userId, id, bodyResult.data);
  if (result.error) {
    return serverError("[PROJ-5] POST /api/vorgaenge/[id]/dokumente failed", result.error);
  }

  return jsonResponse(result.data, 201);
}
