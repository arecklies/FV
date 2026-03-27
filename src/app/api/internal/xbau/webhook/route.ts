import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonResponse } from "@/lib/api/security-headers";
import { serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";

/**
 * POST /api/internal/xbau/webhook
 * Webhook-Empfang vom XBau-Service nach Job-Abschluss.
 * PROJ-7, ADR-015 (E2: Webhook-Kommunikation)
 *
 * Authentifizierung: HMAC-SHA256 Signatur im Header X-Webhook-Signature.
 * KEIN requireAuth() — dieser Endpunkt wird vom XBau-Service aufgerufen, nicht vom Browser.
 */

const WEBHOOK_SECRET = process.env.XBAU_WEBHOOK_SECRET;

const WebhookPayloadSchema = z.object({
  job_id: z.string().uuid(),
  status: z.enum(["completed", "failed"]),
  output: z.record(z.string(), z.unknown()).optional(),
});

/** HMAC-SHA256 Signatur prüfen */
async function verifySignature(payload: string, signature: string | null): Promise<boolean> {
  if (!WEBHOOK_SECRET || !signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expected === signature;
}

export async function POST(request: NextRequest) {
  // 1. HMAC-Signatur prüfen
  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature");

  if (!WEBHOOK_SECRET) {
    console.error("[PROJ-7] XBAU_WEBHOOK_SECRET nicht konfiguriert");
    return jsonResponse({ error: "Webhook nicht konfiguriert" }, 503);
  }

  const valid = await verifySignature(rawBody, signature);
  if (!valid) {
    return jsonResponse({ error: "Ungültige Signatur" }, 401);
  }

  // 2. Payload parsen
  let body: z.infer<typeof WebhookPayloadSchema>;
  try {
    body = WebhookPayloadSchema.parse(JSON.parse(rawBody));
  } catch {
    return jsonResponse({ error: "Ungültiger Payload" }, 400);
  }

  // 3. Job-Status aktualisieren
  const serviceClient = createServiceRoleClient();

  const updates: Record<string, unknown> = {
    status: body.status,
    completed_at: new Date().toISOString(),
    webhook_delivered: true,
  };
  if (body.output) {
    updates.output = body.output;
  }

  const { error } = await serviceClient
    .from("background_jobs")
    .update(updates)
    .eq("id", body.job_id);

  if (error) {
    return serverError("[PROJ-7] Webhook: Job-Update fehlgeschlagen", error);
  }

  return jsonResponse({ received: true });
}
