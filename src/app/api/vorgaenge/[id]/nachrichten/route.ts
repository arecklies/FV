import { NextRequest } from "next/server";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { listeNachrichtenFuerVorgang, getNachrichtenLabel } from "@/lib/services/xbau";
import { UuidParamSchema } from "@/lib/services/verfahren/types";

/**
 * GET /api/vorgaenge/[id]/nachrichten
 * Transportprotokoll: Alle XBau-Nachrichten eines Vorgangs (chronologisch).
 * PROJ-7 US-1c
 */

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Vorgang-ID" });

  const serviceClient = createServiceRoleClient();

  const result = await listeNachrichtenFuerVorgang(serviceClient, auth.tenantId, id);

  if (result.error) {
    return serverError("[PROJ-7] GET /api/vorgaenge/[id]/nachrichten failed", result.error);
  }

  // Anreichern mit lesbaren Labels
  const enriched = result.data.map((n) => ({
    ...n,
    nachrichtentyp_label: getNachrichtenLabel(n.nachrichtentyp),
  }));

  return jsonResponse({ nachrichten: enriched });
}
