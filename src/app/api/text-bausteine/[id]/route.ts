import { NextRequest } from "next/server";
import { requireAdmin, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { validateUuidParam, parseJsonBody } from "@/lib/api/route-helpers";
import { updateBaustein, deactivateBaustein } from "@/lib/services/text-bausteine";
import { UpdateTextBausteinSchema } from "@/lib/services/bescheid/types";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PUT /api/text-bausteine/[id]
 * Textbaustein aktualisieren (nur tenant_admin).
 * PROJ-6 US-2
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const uuidResult = validateUuidParam(id, "Textbaustein-ID");
  if (uuidResult.error) return uuidResult.error;

  const serviceClient = createServiceRoleClient();

  const body = await parseJsonBody(request, UpdateTextBausteinSchema, "[PROJ-6] PUT /api/text-bausteine/[id]");
  if (body.error) return body.error;

  const result = await updateBaustein(serviceClient, auth.tenantId, uuidResult.id, body.data);
  if (result.error) {
    return serverError("[PROJ-6] PUT /api/text-bausteine/[id]", result.error);
  }

  return jsonResponse({ baustein: result.data });
}

/**
 * DELETE /api/text-bausteine/[id]
 * Textbaustein deaktivieren (Soft-Delete, nur tenant_admin).
 * PROJ-6 US-2 AC-5
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const uuidResult = validateUuidParam(id, "Textbaustein-ID");
  if (uuidResult.error) return uuidResult.error;

  const serviceClient = createServiceRoleClient();

  const result = await deactivateBaustein(serviceClient, auth.tenantId, uuidResult.id);
  if (result.error) {
    return serverError("[PROJ-6] DELETE /api/text-bausteine/[id]", result.error);
  }

  return jsonResponse({ success: true });
}
