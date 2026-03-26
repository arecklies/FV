import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { listVorgaenge, createVorgang } from "@/lib/services/verfahren";
import { CreateVorgangSchema, ListVorgaengeQuerySchema } from "@/lib/services/verfahren/types";

/**
 * GET /api/vorgaenge
 * Vorgangsliste mit Filterung, Sortierung, Suche, Paginierung.
 * PROJ-3 US-2
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = ListVorgaengeQuerySchema.safeParse(searchParams);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      fields[issue.path.join(".")] = issue.message;
    });
    return validationError(fields);
  }

  const serviceClient = createServiceRoleClient();
  const result = await listVorgaenge(serviceClient, {
    tenantId: auth.tenantId,
    ...parsed.data,
  });

  if (result.error) {
    return serverError("[PROJ-3] GET /api/vorgaenge failed", result.error);
  }

  return jsonResponse({
    vorgaenge: result.data,
    total: result.total,
    seite: parsed.data.seite,
    pro_seite: parsed.data.pro_seite,
  });
}

/**
 * POST /api/vorgaenge
 * Vorgang anlegen.
 * PROJ-3 US-1
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  let body: z.infer<typeof CreateVorgangSchema>;
  try {
    body = CreateVorgangSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      const fields: Record<string, string> = {};
      err.issues.forEach((issue) => {
        fields[issue.path.join(".")] = issue.message;
      });
      return validationError(fields);
    }
    return serverError("[PROJ-3] POST /api/vorgaenge: parse error", err);
  }

  const serviceClient = createServiceRoleClient();
  const result = await createVorgang(serviceClient, {
    tenantId: auth.tenantId,
    userId: auth.userId,
    ...body,
  });

  if (result.error) {
    return serverError("[PROJ-3] POST /api/vorgaenge failed", result.error);
  }

  return jsonResponse({ vorgang: result.data }, 201);
}
