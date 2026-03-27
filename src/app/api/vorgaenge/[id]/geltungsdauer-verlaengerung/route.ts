import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, notFoundError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { UuidParamSchema } from "@/lib/services/verfahren/types";
import { CreateVerlaengerungSchema } from "@/lib/services/verlaengerung/types";
import { createVerlaengerung, getVerlaengerungen } from "@/lib/services/verlaengerung";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/vorgaenge/[id]/geltungsdauer-verlaengerung
 * Geltungsdauer einer erteilten Baugenehmigung verlängern (PROJ-48 US-3).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Vorgang-ID" });

  let body: z.infer<typeof CreateVerlaengerungSchema>;
  try {
    body = CreateVerlaengerungSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      const fields: Record<string, string> = {};
      err.issues.forEach((issue) => {
        fields[issue.path.join(".")] = issue.message;
      });
      return validationError(fields);
    }
    return serverError("[PROJ-48] POST geltungsdauer-verlaengerung: parse error", err);
  }

  const serviceClient = createServiceRoleClient();

  const result = await createVerlaengerung(serviceClient, {
    tenantId: auth.tenantId,
    userId: auth.userId,
    vorgangId: id,
    antragsdatum: body.antragsdatum,
    begruendung: body.begruendung,
    verlaengerungTage: body.verlaengerung_tage,
  });

  if (result.error) {
    // Kontrollierte Business-Fehler direkt an Client
    const businessErrors = [
      "Vorgang nicht gefunden",
      "Verlängerung nur für abgeschlossene Vorgänge möglich",
      "Kenntnisgabeverfahren haben keine verlängerbare Geltungsdauer",
      "Keine Geltungsdauer gesetzt — bitte zuerst manuell nachpflegen",
      "Genehmigung ist bereits erloschen — Verlängerung nicht mehr möglich",
      "Verfahrensart nicht gefunden",
    ];
    if (businessErrors.includes(result.error)) {
      if (result.error === "Vorgang nicht gefunden" || result.error === "Verfahrensart nicht gefunden") {
        return notFoundError(result.error);
      }
      return jsonResponse({ error: result.error }, 400);
    }
    return serverError("[PROJ-48] createVerlaengerung failed", result.error);
  }

  return jsonResponse({
    message: "Geltungsdauer verlängert",
    id: result.data!.id,
    neues_datum: result.data!.neues_datum,
  }, 201);
}

/**
 * GET /api/vorgaenge/[id]/geltungsdauer-verlaengerung
 * Verlängerungshistorie eines Vorgangs abrufen (PROJ-48 US-4).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Vorgang-ID" });

  const serviceClient = createServiceRoleClient();

  const result = await getVerlaengerungen(serviceClient, auth.tenantId, id);

  if (result.error) {
    return serverError("[PROJ-48] getVerlaengerungen failed", result.error);
  }

  return jsonResponse({ data: result.data });
}
