import { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api/security-headers";
import { serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { aktualisiereAlleAmpelStatus } from "@/lib/services/fristen";

/**
 * POST /api/internal/fristen/ampel-update
 * Interner Endpunkt für Cron-Job (ADR-008 Level 1: pg_cron täglich 06:00 UTC).
 * Aktualisiert den Ampelstatus aller aktiven Fristen.
 *
 * Authentifizierung: CRON_SECRET im Authorization-Header (nicht User-Session).
 * PROJ-4 FA-4
 */
export async function POST(request: NextRequest) {
  // Cron-Secret prüfen (kein User-Auth, sondern shared secret)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[PROJ-4] CRON_SECRET nicht konfiguriert");
    return serverError("[PROJ-4] Cron-Endpunkt nicht konfiguriert", "CRON_SECRET fehlt");
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return jsonResponse({ error: "Nicht autorisiert" }, 401);
  }

  const serviceClient = createServiceRoleClient();
  const result = await aktualisiereAlleAmpelStatus(serviceClient);

  if (result.error) {
    return serverError("[PROJ-4] Ampel-Update failed", result.error);
  }

  console.log(`[PROJ-4] Ampel-Update: ${result.aktualisiert} Fristen aktualisiert`);
  return jsonResponse({ aktualisiert: result.aktualisiert });
}
