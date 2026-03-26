import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, notFoundError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { UuidParamSchema } from "@/lib/services/verfahren/types";
import { getVorgang } from "@/lib/services/verfahren";
import { verlaengereFrist } from "@/lib/services/fristen";
import { VerlaengerungSchema } from "@/lib/services/fristen/types";

type RouteParams = { params: Promise<{ id: string; fristId: string }> };

/**
 * PATCH /api/vorgaenge/[id]/fristen/[fristId]/verlaengerung
 * Frist verlängern mit Begründung (Pflichtfeld).
 * PROJ-4 US-4
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id, fristId } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Vorgang-ID" });
  const fristIdResult = UuidParamSchema.safeParse(fristId);
  if (!fristIdResult.success) return validationError({ fristId: "Ungültige Frist-ID" });

  let body: z.infer<typeof VerlaengerungSchema>;
  try {
    body = VerlaengerungSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      const fields: Record<string, string> = {};
      err.issues.forEach((issue) => {
        fields[issue.path.join(".")] = issue.message;
      });
      return validationError(fields);
    }
    return serverError("[PROJ-4] PATCH verlaengerung: parse error", err);
  }

  const serviceClient = createServiceRoleClient();

  // Vorgang-Existenz und Bundesland prüfen
  const vorgangResult = await getVorgang(serviceClient, auth.tenantId, id);
  if (vorgangResult.error || !vorgangResult.data) {
    return notFoundError("Vorgang nicht gefunden");
  }

  const result = await verlaengereFrist(serviceClient, {
    tenantId: auth.tenantId,
    userId: auth.userId,
    fristId,
    zusaetzlicheWerktage: body.zusaetzliche_werktage,
    begruendung: body.begruendung,
    bundesland: vorgangResult.data.bundesland,
  });

  if (result.error) {
    if (result.error === "Frist nicht gefunden") {
      return notFoundError(result.error);
    }
    return serverError("[PROJ-4] PATCH verlaengerung failed", result.error);
  }

  return jsonResponse({ frist: result.data });
}
