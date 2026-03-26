import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, notFoundError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { UuidParamSchema } from "@/lib/services/verfahren/types";
import { getVorgang } from "@/lib/services/verfahren";
import { hemmeFrist, hebeHemmungAuf } from "@/lib/services/fristen";
import { HemmungStartSchema } from "@/lib/services/fristen/types";

type RouteParams = { params: Promise<{ id: string; fristId: string }> };

/**
 * POST /api/vorgaenge/[id]/fristen/[fristId]/hemmung
 * Frist hemmen (z.B. bei Nachforderung wegen Unvollständigkeit).
 * PROJ-4 US-5
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id, fristId } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Vorgang-ID" });
  const fristIdResult = UuidParamSchema.safeParse(fristId);
  if (!fristIdResult.success) return validationError({ fristId: "Ungültige Frist-ID" });

  let body: z.infer<typeof HemmungStartSchema>;
  try {
    body = HemmungStartSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      const fields: Record<string, string> = {};
      err.issues.forEach((issue) => {
        fields[issue.path.join(".")] = issue.message;
      });
      return validationError(fields);
    }
    return serverError("[PROJ-4] POST hemmung: parse error", err);
  }

  const serviceClient = createServiceRoleClient();

  // Vorgang-Existenz prüfen
  const vorgangResult = await getVorgang(serviceClient, auth.tenantId, id);
  if (vorgangResult.error || !vorgangResult.data) {
    return notFoundError("Vorgang nicht gefunden");
  }

  const result = await hemmeFrist(serviceClient, {
    tenantId: auth.tenantId,
    userId: auth.userId,
    fristId,
    grund: body.grund,
    ende: body.ende,
  });

  if (result.error) {
    if (result.error === "Frist nicht gefunden") {
      return notFoundError(result.error);
    }
    if (result.error === "Frist ist bereits gehemmt") {
      return jsonResponse({ error: result.error }, 409);
    }
    return serverError("[PROJ-4] POST hemmung failed", result.error);
  }

  return jsonResponse({ frist: result.data });
}

/**
 * DELETE /api/vorgaenge/[id]/fristen/[fristId]/hemmung
 * Hemmung aufheben. Frist wird um Hemmungstage verlängert.
 * PROJ-4 US-5 AC-3
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id, fristId } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Vorgang-ID" });
  const fristIdResult = UuidParamSchema.safeParse(fristId);
  if (!fristIdResult.success) return validationError({ fristId: "Ungültige Frist-ID" });

  const serviceClient = createServiceRoleClient();

  // Vorgang-Existenz und Bundesland prüfen
  const vorgangResult = await getVorgang(serviceClient, auth.tenantId, id);
  if (vorgangResult.error || !vorgangResult.data) {
    return notFoundError("Vorgang nicht gefunden");
  }

  const result = await hebeHemmungAuf(serviceClient, {
    tenantId: auth.tenantId,
    userId: auth.userId,
    fristId,
    bundesland: vorgangResult.data.bundesland,
  });

  if (result.error) {
    if (result.error === "Frist nicht gefunden") {
      return notFoundError(result.error);
    }
    if (result.error === "Frist ist nicht gehemmt") {
      return jsonResponse({ error: result.error }, 409);
    }
    return serverError("[PROJ-4] DELETE hemmung failed", result.error);
  }

  return jsonResponse({ frist: result.data });
}
