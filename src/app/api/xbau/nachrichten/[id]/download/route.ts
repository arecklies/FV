import { NextRequest } from "next/server";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { SECURITY_HEADERS } from "@/lib/api/security-headers";
import { validationError, notFoundError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { UuidParamSchema } from "@/lib/services/verfahren/types";

/**
 * GET /api/xbau/nachrichten/[id]/download
 * Laed das Roh-XML einer XBau-Nachricht als Datei herunter.
 * PROJ-7 US-2 AC-7
 *
 * Nur fuer ausgehende Nachrichten. Aktualisiert Status auf 'heruntergeladen'.
 */

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  // Auth
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  // Path-Parameter validieren
  const { id } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Nachrichten-ID" });

  const serviceClient = createServiceRoleClient();

  // Nachricht laden (nur eigener Tenant)
  const { data: nachricht, error: loadError } = await serviceClient
    .from("xbau_nachrichten")
    .select("id, nachrichten_uuid, nachrichtentyp, richtung, status, roh_xml")
    .eq("id", id)
    .eq("tenant_id", auth.tenantId)
    .limit(1)
    .single();

  if (loadError || !nachricht) {
    return notFoundError("Nachricht nicht gefunden");
  }

  if (!nachricht.roh_xml) {
    return serverError("[PROJ-7] Nachricht hat kein Roh-XML", { nachricht_id: id });
  }

  // Status auf 'heruntergeladen' aktualisieren (nur bei ausgehenden Nachrichten)
  if (nachricht.richtung === "ausgang" && nachricht.status === "generiert") {
    const { error: updateError } = await serviceClient
      .from("xbau_nachrichten")
      .update({ status: "heruntergeladen" })
      .eq("id", id)
      .eq("tenant_id", auth.tenantId);

    if (updateError) {
      console.error("[PROJ-7] Status-Update auf heruntergeladen fehlgeschlagen", updateError.message);
    }
  }

  // XML als Download zurueckgeben
  const filename = `${nachricht.nachrichtentyp}_${nachricht.nachrichten_uuid}.xml`;

  return new Response(nachricht.roh_xml, {
    status: 200,
    headers: {
      ...SECURITY_HEADERS,
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
