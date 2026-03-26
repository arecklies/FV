import { NextRequest } from "next/server";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { listGefaehrdeteFristen, gruppiereNachSachbearbeiter } from "@/lib/services/fristen";
import { GefaehrdeteQuerySchema } from "@/lib/services/fristen/types";

/**
 * GET /api/fristen/gefaehrdet
 * Fristgefährdete Vorgänge für Dashboard (gelb, rot, dunkelrot).
 * PROJ-4 US-3 (Referatsleiter-Dashboard)
 * PROJ-21: Gruppierung nach Sachbearbeiter + nur_ueberschritten-Filter
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = GefaehrdeteQuerySchema.safeParse(searchParams);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      fields[issue.path.join(".")] = issue.message;
    });
    return validationError(fields);
  }

  const serviceClient = createServiceRoleClient();
  const result = await listGefaehrdeteFristen(serviceClient, {
    tenantId: auth.tenantId,
    seite: parsed.data.seite,
    proSeite: parsed.data.pro_seite,
    nurUeberschritten: parsed.data.nur_ueberschritten,
  });

  if (result.error) {
    return serverError("[PROJ-21] GET /api/fristen/gefaehrdet failed", result.error);
  }

  // PROJ-21 US-1: Gruppierung nach Sachbearbeiter
  if (parsed.data.gruppiert_nach === "sachbearbeiter") {
    const gruppen = gruppiereNachSachbearbeiter(result.data);
    return jsonResponse({
      gruppen,
      total: result.total,
      seite: parsed.data.seite,
      pro_seite: parsed.data.pro_seite,
    });
  }

  return jsonResponse({
    fristen: result.data,
    total: result.total,
    seite: parsed.data.seite,
    pro_seite: parsed.data.pro_seite,
  });
}
