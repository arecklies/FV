import { NextRequest } from "next/server";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { validateUuidParam, validateVorgangAccess } from "@/lib/api/route-helpers";
import { erzeugeDownloadUrl } from "@/lib/services/dokumente";

type RouteParams = { params: Promise<{ id: string; dokId: string }> };

/**
 * GET /api/vorgaenge/[id]/dokumente/[dokId]/download
 * Erzeugt eine signierte Download-URL (60 Min).
 * Optional: ?version=N fuer eine bestimmte Version.
 * PROJ-5 US-3 (AC-6)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id, dokId } = await params;
  const serviceClient = createServiceRoleClient();

  const vorgangResult = await validateVorgangAccess(serviceClient, auth.tenantId, id);
  if (vorgangResult.error) return vorgangResult.error;

  const dokIdResult = validateUuidParam(dokId, "Dokument-ID");
  if (dokIdResult.error) return dokIdResult.error;

  // Optionaler Query-Parameter: version
  const versionParam = request.nextUrl.searchParams.get("version");
  const version = versionParam ? parseInt(versionParam, 10) : undefined;
  if (versionParam && (isNaN(version!) || version! < 1)) {
    return jsonResponse({ error: "Ungültige Versionsnummer" }, 400);
  }

  const result = await erzeugeDownloadUrl(serviceClient, auth.tenantId, dokIdResult.id, version);
  if (result.error) {
    return serverError("[PROJ-5] GET /api/vorgaenge/[id]/dokumente/[dokId]/download failed", result.error);
  }

  return jsonResponse(result.data);
}
