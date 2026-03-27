import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, notFoundError, conflictError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { getVorgang } from "@/lib/services/verfahren";
import { pausiereVorgang } from "@/lib/services/fristen";
import { PauseVorgangSchema } from "@/lib/services/fristen/types";
import { UuidParamSchema } from "@/lib/services/verfahren/types";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/vorgaenge/[id]/pause
 * Verfahren pausieren — alle aktiven Fristen werden pausiert (PROJ-37 US-1).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Vorgang-ID" });

  let body: z.infer<typeof PauseVorgangSchema>;
  try {
    body = PauseVorgangSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      const fields: Record<string, string> = {};
      err.issues.forEach((issue) => {
        fields[issue.path.join(".")] = issue.message;
      });
      return validationError(fields);
    }
    return serverError("[PROJ-37] POST /api/vorgaenge/[id]/pause: parse error", err);
  }

  const serviceClient = createServiceRoleClient();

  // Vorgang laden (Existenz + Tenant-Zugehörigkeit)
  const vorgangResult = await getVorgang(serviceClient, auth.tenantId, id);
  if (vorgangResult.error || !vorgangResult.data) {
    return notFoundError("Vorgang nicht gefunden");
  }

  const result = await pausiereVorgang(serviceClient, {
    tenantId: auth.tenantId,
    userId: auth.userId,
    vorgangId: id,
    begruendung: body.begruendung,
  });

  if (result.error) {
    if (result.error === "Vorgang ist bereits pausiert") {
      return conflictError(result.error);
    }
    return serverError("[PROJ-37] POST /api/vorgaenge/[id]/pause failed", result.error);
  }

  return jsonResponse({
    message: "Verfahren pausiert",
    pause_id: result.pauseId,
    anzahl_pausiert: result.anzahlPausiert,
  });
}
