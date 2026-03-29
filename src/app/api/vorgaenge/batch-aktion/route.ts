import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { executeBatchAktion } from "@/lib/services/verfahren/batch";
import { BatchAktionSchema } from "@/lib/services/verfahren/types";

/**
 * POST /api/vorgaenge/batch-aktion
 * Massenoperationen auf Vorgaenge (Zuweisen, Status aendern, Frist verschieben).
 * HTTP 200 auch bei Teilfehlern (Batch war erfolgreich, einzelne Vorgaenge koennen fehlschlagen).
 * PROJ-17 US-1
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  let body: z.infer<typeof BatchAktionSchema>;
  try {
    body = BatchAktionSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      const fields: Record<string, string> = {};
      err.issues.forEach((issue) => {
        fields[issue.path.join(".")] = issue.message;
      });
      return validationError(fields);
    }
    return serverError("[PROJ-17] POST /api/vorgaenge/batch-aktion: parse error", err);
  }

  const serviceClient = createServiceRoleClient();

  try {
    const result = await executeBatchAktion(
      serviceClient,
      {
        tenantId: auth.tenantId,
        userId: auth.userId,
        userRole: auth.role,
      },
      body
    );

    return jsonResponse(result);
  } catch (err) {
    return serverError("[PROJ-17] POST /api/vorgaenge/batch-aktion failed", err);
  }
}
