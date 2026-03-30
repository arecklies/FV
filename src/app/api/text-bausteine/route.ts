import { NextRequest } from "next/server";
import { requireAuth, requireAdmin, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { parseJsonBody } from "@/lib/api/route-helpers";
import { listBausteine, createBaustein } from "@/lib/services/text-bausteine";
import {
  CreateTextBausteinSchema,
  ListBausteineFilterSchema,
} from "@/lib/services/bescheid/types";

/**
 * GET /api/text-bausteine
 * Textbausteine des Tenants auflisten.
 * Query-Parameter: kategorie, verfahrensart, bescheidtyp, suche, nur_aktive
 * PROJ-6 US-1 AC-3, US-2
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const serviceClient = createServiceRoleClient();

  // Query-Parameter parsen
  const url = new URL(request.url);
  const filterRaw: Record<string, unknown> = {};
  if (url.searchParams.has("kategorie")) filterRaw.kategorie = url.searchParams.get("kategorie");
  if (url.searchParams.has("verfahrensart")) filterRaw.verfahrensart = url.searchParams.get("verfahrensart");
  if (url.searchParams.has("bescheidtyp")) filterRaw.bescheidtyp = url.searchParams.get("bescheidtyp");
  if (url.searchParams.has("suche")) filterRaw.suche = url.searchParams.get("suche");
  if (url.searchParams.has("nur_aktive")) filterRaw.nur_aktive = url.searchParams.get("nur_aktive") !== "false";

  const filterResult = ListBausteineFilterSchema.safeParse(filterRaw);
  const filter = filterResult.success ? filterResult.data : undefined;

  const result = await listBausteine(serviceClient, auth.tenantId, filter);
  if (result.error) {
    return serverError("[PROJ-6] GET /api/text-bausteine", result.error);
  }

  return jsonResponse({ bausteine: result.data, total: result.data.length });
}

/**
 * POST /api/text-bausteine
 * Neuen Textbaustein anlegen (nur tenant_admin).
 * PROJ-6 US-2 AC-1
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!isAuthContext(auth)) return auth;

  const serviceClient = createServiceRoleClient();

  const body = await parseJsonBody(request, CreateTextBausteinSchema, "[PROJ-6] POST /api/text-bausteine");
  if (body.error) return body.error;

  const result = await createBaustein(serviceClient, auth.tenantId, auth.userId, body.data);
  if (result.error) {
    return serverError("[PROJ-6] POST /api/text-bausteine", result.error);
  }

  return jsonResponse({ baustein: result.data }, 201);
}
