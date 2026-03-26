import { NextRequest } from "next/server";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { getWorkflowHistorie } from "@/lib/services/workflow";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/vorgaenge/[id]/workflow-historie
 * Workflow-Schritt-Historie fuer einen Vorgang.
 * ADR-011
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const serviceClient = createServiceRoleClient();

  const result = await getWorkflowHistorie(serviceClient, auth.tenantId, id);
  if (result.error) {
    return serverError("[PROJ-3] GET /api/vorgaenge/[id]/workflow-historie failed", result.error);
  }

  return jsonResponse({ schritte: result.data });
}
