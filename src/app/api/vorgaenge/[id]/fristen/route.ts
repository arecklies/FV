import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, notFoundError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { UuidParamSchema } from "@/lib/services/verfahren/types";
import { getVorgang } from "@/lib/services/verfahren";
import { getFristen, createFrist } from "@/lib/services/fristen";
import { CreateFristSchema } from "@/lib/services/fristen/types";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/vorgaenge/[id]/fristen
 * Alle aktiven Fristen eines Vorgangs.
 * PROJ-4 US-1, US-2
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Vorgang-ID" });

  const serviceClient = createServiceRoleClient();

  // Vorgang-Existenz und Tenant-Zugehörigkeit prüfen
  const vorgangResult = await getVorgang(serviceClient, auth.tenantId, id);
  if (vorgangResult.error || !vorgangResult.data) {
    return notFoundError("Vorgang nicht gefunden");
  }

  const result = await getFristen(serviceClient, auth.tenantId, id);
  if (result.error) {
    return serverError("[PROJ-4] GET /api/vorgaenge/[id]/fristen failed", result.error);
  }

  return jsonResponse({ fristen: result.data });
}

/**
 * POST /api/vorgaenge/[id]/fristen
 * Frist für einen Vorgang anlegen.
 * PROJ-4 US-1
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Vorgang-ID" });

  let body: z.infer<typeof CreateFristSchema>;
  try {
    body = CreateFristSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      const fields: Record<string, string> = {};
      err.issues.forEach((issue) => {
        fields[issue.path.join(".")] = issue.message;
      });
      return validationError(fields);
    }
    return serverError("[PROJ-4] POST /api/vorgaenge/[id]/fristen: parse error", err);
  }

  const serviceClient = createServiceRoleClient();

  // Vorgang-Existenz und Bundesland prüfen
  const vorgangResult = await getVorgang(serviceClient, auth.tenantId, id);
  if (vorgangResult.error || !vorgangResult.data) {
    return notFoundError("Vorgang nicht gefunden");
  }

  const result = await createFrist(serviceClient, {
    tenantId: auth.tenantId,
    userId: auth.userId,
    vorgangId: id,
    typ: body.typ,
    bezeichnung: body.bezeichnung,
    werktage: body.werktage,
    startDatum: body.start_datum,
    bundesland: vorgangResult.data.bundesland,
  });

  if (result.error) {
    return serverError("[PROJ-4] POST /api/vorgaenge/[id]/fristen failed", result.error);
  }

  return jsonResponse({ frist: result.data }, 201);
}
