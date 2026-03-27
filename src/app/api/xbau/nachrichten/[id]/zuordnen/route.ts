import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { zuordneNachricht } from "@/lib/services/xbau";
import { UuidParamSchema } from "@/lib/services/verfahren/types";

/**
 * POST /api/xbau/nachrichten/[id]/zuordnen
 * Manuelle Zuordnung einer Nachricht zu einem Vorgang.
 * PROJ-7 US-1b AC-5, AC-6
 */

type RouteParams = { params: Promise<{ id: string }> };

const ZuordnenSchema = z.object({
  vorgang_id: z.string().uuid("Ungültige Vorgang-ID"),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Nachrichten-ID" });

  let body: z.infer<typeof ZuordnenSchema>;
  try {
    body = ZuordnenSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      const fields: Record<string, string> = {};
      err.issues.forEach((issue) => {
        fields[issue.path.join(".")] = issue.message;
      });
      return validationError(fields);
    }
    return serverError("[PROJ-7] POST /api/xbau/nachrichten/[id]/zuordnen: parse error", err);
  }

  const serviceClient = createServiceRoleClient();

  const result = await zuordneNachricht(
    serviceClient,
    auth.tenantId,
    id,
    body.vorgang_id
  );

  if (result.error) {
    return serverError("[PROJ-7] POST /api/xbau/nachrichten/[id]/zuordnen failed", result.error);
  }

  return jsonResponse({ success: true });
}
