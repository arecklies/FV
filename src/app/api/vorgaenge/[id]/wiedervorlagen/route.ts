import { NextRequest } from "next/server";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { parseJsonBody, validateVorgangAccess } from "@/lib/api/route-helpers";
import { CreateWiedervorlageSchema } from "@/lib/services/wiedervorlagen/types";
import {
  createWiedervorlage,
  listWiedervorlagen,
} from "@/lib/services/wiedervorlagen";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/vorgaenge/[id]/wiedervorlagen
 * Alle Wiedervorlagen des aktuellen Users fuer einen Vorgang.
 * PROJ-53 US-1, US-3
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const serviceClient = createServiceRoleClient();

  // Vorgang-Existenz und Tenant-Zugehoerigkeit pruefen
  const vorgangResult = await validateVorgangAccess(serviceClient, auth.tenantId, id);
  if (vorgangResult.error) return vorgangResult.error;

  const result = await listWiedervorlagen(
    serviceClient,
    auth.tenantId,
    auth.userId,
    vorgangResult.vorgang.id
  );

  if (result.error) {
    return serverError("[PROJ-53] GET /api/vorgaenge/[id]/wiedervorlagen failed", result.error);
  }

  return jsonResponse({ wiedervorlagen: result.data });
}

/**
 * POST /api/vorgaenge/[id]/wiedervorlagen
 * Wiedervorlage fuer einen Vorgang anlegen.
 * PROJ-53 US-1
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;

  const bodyResult = await parseJsonBody(
    request,
    CreateWiedervorlageSchema,
    "[PROJ-53] POST /api/vorgaenge/[id]/wiedervorlagen"
  );
  if (bodyResult.error) return bodyResult.error;

  const serviceClient = createServiceRoleClient();

  // Vorgang-Existenz und Tenant-Zugehoerigkeit pruefen
  const vorgangResult = await validateVorgangAccess(serviceClient, auth.tenantId, id);
  if (vorgangResult.error) return vorgangResult.error;

  const result = await createWiedervorlage(
    serviceClient,
    auth.tenantId,
    auth.userId,
    vorgangResult.vorgang.id,
    bodyResult.data
  );

  if (result.error) {
    // Limit-Fehler als 409 (Conflict) zurueckgeben
    if (result.error.includes("Maximal")) {
      return jsonResponse({ error: result.error }, 409);
    }
    return serverError("[PROJ-53] POST /api/vorgaenge/[id]/wiedervorlagen failed", result.error);
  }

  return jsonResponse({ wiedervorlage: result.data }, 201);
}
