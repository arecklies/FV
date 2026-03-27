import { NextRequest } from "next/server";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, notFoundError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { getVorgang } from "@/lib/services/verfahren";
import { setzeVorgangFort } from "@/lib/services/fristen";
import { UuidParamSchema } from "@/lib/services/verfahren/types";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/vorgaenge/[id]/fortsetzen
 * Verfahren fortsetzen — pausierte Fristen werden mit korrigierter Restlaufzeit fortgesetzt (PROJ-37 US-2).
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Vorgang-ID" });

  const serviceClient = createServiceRoleClient();

  // Vorgang laden (Existenz + Tenant + Bundesland für Feiertags-Lookup)
  const vorgangResult = await getVorgang(serviceClient, auth.tenantId, id);
  if (vorgangResult.error || !vorgangResult.data) {
    return notFoundError("Vorgang nicht gefunden");
  }

  const vorgang = vorgangResult.data;
  const result = await setzeVorgangFort(serviceClient, {
    tenantId: auth.tenantId,
    userId: auth.userId,
    vorgangId: id,
    bundesland: vorgang.bundesland,
  });

  if (result.error) {
    if (result.error === "Keine offene Pause gefunden") {
      return notFoundError(result.error);
    }
    return serverError("[PROJ-37] POST /api/vorgaenge/[id]/fortsetzen failed", result.error);
  }

  return jsonResponse({
    message: "Verfahren fortgesetzt",
    pause_werktage: result.pauseWerktage,
    anzahl_fortgesetzt: result.anzahlFortgesetzt,
  });
}
