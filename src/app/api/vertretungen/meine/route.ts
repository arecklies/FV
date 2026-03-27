import { z } from "zod";
import { requireReferatsleiter, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, serverError, conflictError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import {
  getStellvertreterFuer,
  createVertretung,
} from "@/lib/services/stellvertreter";
import { CreateVertretungSchema } from "@/lib/services/stellvertreter/types";

/**
 * GET /api/vertretungen/meine
 * Eigene Stellvertreter auflisten (PROJ-35 US-1).
 * Erfordert: referatsleiter
 */
export async function GET() {
  const auth = await requireReferatsleiter();
  if (!isAuthContext(auth)) return auth;

  const serviceClient = createServiceRoleClient();
  const result = await getStellvertreterFuer(serviceClient, auth.tenantId, auth.userId);

  if (result.error) {
    return serverError("[PROJ-35] GET /api/vertretungen/meine failed", result.error);
  }

  return jsonResponse({ vertretungen: result.data });
}

/**
 * POST /api/vertretungen/meine
 * Stellvertreter hinzufuegen (PROJ-35 US-1).
 * Erfordert: referatsleiter
 */
export async function POST(request: Request) {
  const auth = await requireReferatsleiter();
  if (!isAuthContext(auth)) return auth;

  let body: z.infer<typeof CreateVertretungSchema>;
  try {
    body = CreateVertretungSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      const fields: Record<string, string> = {};
      err.issues.forEach((issue) => {
        fields[issue.path.join(".")] = issue.message;
      });
      return validationError(fields);
    }
    return serverError("[PROJ-35] POST /api/vertretungen/meine: parse error", err);
  }

  const serviceClient = createServiceRoleClient();
  const result = await createVertretung(serviceClient, {
    tenantId: auth.tenantId,
    vertretenerId: auth.userId,
    stellvertreterId: body.stellvertreter_id,
    auditUserId: auth.userId,
  });

  if (result.error) {
    // Kontrollierte Business-Fehler
    const conflictErrors = [
      "Diese Vertretungszuordnung existiert bereits",
      "Selbstzuordnung ist nicht möglich",
    ];
    if (conflictErrors.includes(result.error)) {
      return conflictError(result.error);
    }
    if (result.error.includes("nicht im Mandanten") || result.error.includes("mindestens Referatsleiter")) {
      return validationError({ stellvertreter_id: result.error });
    }
    return serverError("[PROJ-35] POST /api/vertretungen/meine failed", result.error);
  }

  return jsonResponse({ vertretung: result.data }, 201);
}
