import { NextRequest } from "next/server";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { FaelligeQuerySchema } from "@/lib/services/wiedervorlagen/types";
import { listFaelligeWiedervorlagen } from "@/lib/services/wiedervorlagen";

/**
 * GET /api/wiedervorlagen/faellig?tage_voraus=5
 * Faellige und bald faellige Wiedervorlagen des aktuellen Users.
 * PROJ-53 US-2
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  // Query-Parameter parsen
  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const queryResult = FaelligeQuerySchema.safeParse(searchParams);

  if (!queryResult.success) {
    const fields: Record<string, string> = {};
    queryResult.error.issues.forEach((issue) => {
      fields[issue.path.join(".")] = issue.message;
    });
    return validationError(fields);
  }

  const serviceClient = createServiceRoleClient();

  const result = await listFaelligeWiedervorlagen(
    serviceClient,
    auth.tenantId,
    auth.userId,
    queryResult.data.tage_voraus
  );

  if (result.error) {
    return serverError("[PROJ-53] GET /api/wiedervorlagen/faellig failed", result.error);
  }

  return jsonResponse({ wiedervorlagen: result.data });
}
