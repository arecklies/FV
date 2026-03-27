import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { listeFehlerNachrichten, listeUnzugeordneteNachrichten } from "@/lib/services/xbau";

/**
 * GET /api/xbau/nachrichten?queue=fehler|zuordnung
 * Fehler-Queue oder Zuordnungs-Queue für den aktuellen Tenant.
 * PROJ-7 US-1 AC-8, US-1b AC-5
 */

const QuerySchema = z.object({
  queue: z.enum(["fehler", "zuordnung"]).default("fehler"),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = QuerySchema.safeParse(searchParams);
  if (!parsed.success) {
    return validationError({ queue: "Ungültiger Queue-Typ. Erlaubt: fehler, zuordnung" });
  }

  const serviceClient = createServiceRoleClient();

  const result = parsed.data.queue === "fehler"
    ? await listeFehlerNachrichten(serviceClient, auth.tenantId)
    : await listeUnzugeordneteNachrichten(serviceClient, auth.tenantId);

  if (result.error) {
    return serverError("[PROJ-7] GET /api/xbau/nachrichten failed", result.error);
  }

  return jsonResponse({
    nachrichten: result.data,
    queue: parsed.data.queue,
  });
}
