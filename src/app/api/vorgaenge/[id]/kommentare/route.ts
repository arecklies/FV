import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { listKommentare, createKommentar } from "@/lib/services/verfahren";
import { KommentarSchema, UuidParamSchema } from "@/lib/services/verfahren/types";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/vorgaenge/[id]/kommentare
 * Kommentare zu einem Vorgang auflisten.
 * PROJ-3 US-4
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Vorgang-ID" });

  const serviceClient = createServiceRoleClient();

  const result = await listKommentare(serviceClient, auth.tenantId, id);
  if (result.error) {
    return serverError("[PROJ-3] GET /api/vorgaenge/[id]/kommentare failed", result.error);
  }

  return jsonResponse({ kommentare: result.data });
}

/**
 * POST /api/vorgaenge/[id]/kommentare
 * Kommentar zu einem Vorgang hinzufuegen.
 * PROJ-3 US-4
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Vorgang-ID" });

  let body: z.infer<typeof KommentarSchema>;
  try {
    body = KommentarSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      const fields: Record<string, string> = {};
      err.issues.forEach((issue) => {
        fields[issue.path.join(".")] = issue.message;
      });
      return validationError(fields);
    }
    return serverError("[PROJ-3] POST /api/vorgaenge/[id]/kommentare: parse error", err);
  }

  const serviceClient = createServiceRoleClient();
  const result = await createKommentar(serviceClient, auth.tenantId, auth.userId, id, body.inhalt);

  if (result.error) {
    return serverError("[PROJ-3] POST /api/vorgaenge/[id]/kommentare failed", result.error);
  }

  return jsonResponse({ kommentar: result.data }, 201);
}
