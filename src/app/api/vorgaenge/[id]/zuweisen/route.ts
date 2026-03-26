import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { zuweiseVorgang } from "@/lib/services/verfahren";
import { ZuweisenSchema, UuidParamSchema } from "@/lib/services/verfahren/types";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/vorgaenge/[id]/zuweisen
 * Vorgang an anderen Sachbearbeiter uebergeben.
 * PROJ-3 US-3
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Vorgang-ID" });

  let body: z.infer<typeof ZuweisenSchema>;
  try {
    body = ZuweisenSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      const fields: Record<string, string> = {};
      err.issues.forEach((issue) => {
        fields[issue.path.join(".")] = issue.message;
      });
      return validationError(fields);
    }
    return serverError("[PROJ-3] POST /api/vorgaenge/[id]/zuweisen: parse error", err);
  }

  const serviceClient = createServiceRoleClient();
  const result = await zuweiseVorgang(
    serviceClient,
    auth.tenantId,
    auth.userId,
    id,
    body.zustaendiger_user_id
  );

  if (result.error) {
    // Kontrollierte Meldung: nur bekannte Business-Fehler an Client
    if (result.error === "Zielbenutzer gehört nicht zum selben Mandanten") {
      return jsonResponse({ error: result.error }, 400);
    }
    return serverError("[PROJ-3] POST /api/vorgaenge/[id]/zuweisen failed", result.error);
  }

  return jsonResponse({ message: "Vorgang zugewiesen" });
}
