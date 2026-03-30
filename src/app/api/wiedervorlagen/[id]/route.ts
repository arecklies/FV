import { NextRequest } from "next/server";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { parseJsonBody, validateUuidParam } from "@/lib/api/route-helpers";
import {
  UpdateWiedervorlageSchema,
  WiedervorlageDbSchema,
} from "@/lib/services/wiedervorlagen/types";
import {
  erledigeWiedervorlage,
  deleteWiedervorlage,
} from "@/lib/services/wiedervorlagen";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/wiedervorlagen/[id]
 * Wiedervorlage aktualisieren (z.B. als erledigt markieren).
 * PROJ-53 US-3
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const uuidResult = validateUuidParam(id, "Wiedervorlage-ID");
  if (uuidResult.error) return uuidResult.error;

  const bodyResult = await parseJsonBody(
    request,
    UpdateWiedervorlageSchema,
    "[PROJ-53] PATCH /api/wiedervorlagen/[id]"
  );
  if (bodyResult.error) return bodyResult.error;

  const serviceClient = createServiceRoleClient();

  // Wenn erledigt_am gesetzt wird, nutze erledigeWiedervorlage
  if (bodyResult.data.erledigt_am !== undefined && bodyResult.data.erledigt_am !== null) {
    const result = await erledigeWiedervorlage(
      serviceClient,
      auth.tenantId,
      auth.userId,
      uuidResult.id
    );

    if (result.error) {
      return jsonResponse({ error: result.error }, 404);
    }

    return jsonResponse({ wiedervorlage: result.data });
  }

  // Allgemeines Update (faellig_am, betreff, notiz, erledigt_am=null fuer "un-erledigen")
  const updateData: Record<string, unknown> = {};
  if (bodyResult.data.faellig_am !== undefined) updateData.faellig_am = bodyResult.data.faellig_am;
  if (bodyResult.data.betreff !== undefined) updateData.betreff = bodyResult.data.betreff;
  if (bodyResult.data.notiz !== undefined) updateData.notiz = bodyResult.data.notiz;
  if (bodyResult.data.erledigt_am === null) updateData.erledigt_am = null;

  if (Object.keys(updateData).length === 0) {
    return jsonResponse({ error: "Keine Felder zum Aktualisieren angegeben" }, 400);
  }

  const { data: updated, error } = await serviceClient
    .from("wiedervorlagen")
    .update(updateData)
    .eq("id", uuidResult.id)
    .eq("tenant_id", auth.tenantId)
    .eq("user_id", auth.userId)
    .select()
    .single();

  if (error) {
    return jsonResponse({ error: "Wiedervorlage nicht gefunden" }, 404);
  }

  return jsonResponse({ wiedervorlage: WiedervorlageDbSchema.parse(updated) });
}

/**
 * DELETE /api/wiedervorlagen/[id]
 * Wiedervorlage loeschen (Hard-Delete).
 * PROJ-53 US-3
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const uuidResult = validateUuidParam(id, "Wiedervorlage-ID");
  if (uuidResult.error) return uuidResult.error;

  const serviceClient = createServiceRoleClient();

  const result = await deleteWiedervorlage(
    serviceClient,
    auth.tenantId,
    auth.userId,
    uuidResult.id
  );

  if (result.error) {
    return jsonResponse({ error: result.error }, 404);
  }

  return jsonResponse({ deleted: true });
}
