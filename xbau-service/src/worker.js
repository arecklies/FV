/**
 * XBau-Service Worker (PROJ-7, ADR-015)
 *
 * Pollt background_jobs-Tabelle, verarbeitet XBau-Aufträge,
 * sendet Webhook an Fachverfahren nach Abschluss.
 *
 * Deployment: Docker-Container (Fly.io / Railway)
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WEBHOOK_SECRET, FACHVERFAHREN_URL
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const FACHVERFAHREN_URL = process.env.FACHVERFAHREN_URL;
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || "5000", 10);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY sind Pflicht");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** HMAC-SHA256 Signatur erzeugen */
function signPayload(payload) {
  if (!WEBHOOK_SECRET) return null;
  return crypto.createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");
}

/** Webhook an Fachverfahren senden */
async function sendWebhook(jobId, status, output) {
  if (!FACHVERFAHREN_URL || !WEBHOOK_SECRET) {
    console.warn("[Worker] Webhook nicht konfiguriert, überspringe");
    return;
  }

  const payload = JSON.stringify({ job_id: jobId, status, output });
  const signature = signPayload(payload);

  try {
    const res = await fetch(`${FACHVERFAHREN_URL}/api/internal/xbau/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
      },
      body: payload,
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`[Worker] Webhook fehlgeschlagen: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error("[Worker] Webhook-Fehler:", err.message);
  }
}

/** Nächsten Job holen und verarbeiten */
async function pollAndProcess() {
  // Pending Jobs mit fälligem Retry holen
  const now = new Date().toISOString();
  const { data: job, error } = await supabase
    .from("background_jobs")
    .select("*")
    .eq("status", "pending")
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !job) return; // Kein Job verfügbar

  // Atomisch auf processing setzen
  const { error: claimError } = await supabase
    .from("background_jobs")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
      attempts: job.attempts + 1,
    })
    .eq("id", job.id)
    .eq("status", "pending");

  if (claimError) return; // Anderer Worker war schneller

  console.log(`[Worker] Job ${job.id} (${job.type}) gestartet, Versuch ${job.attempts + 1}/${job.max_attempts}`);

  try {
    const output = await processJob(job);

    // Erfolg
    await supabase
      .from("background_jobs")
      .update({
        status: "completed",
        output,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    console.log(`[Worker] Job ${job.id} abgeschlossen`);
    await sendWebhook(job.id, "completed", output);
  } catch (err) {
    console.error(`[Worker] Job ${job.id} fehlgeschlagen:`, err.message);

    const nextAttempt = job.attempts + 1;
    const RETRY_DELAYS = [30_000, 60_000, 120_000];

    if (nextAttempt < job.max_attempts) {
      // Retry
      const delay = RETRY_DELAYS[Math.min(nextAttempt, RETRY_DELAYS.length - 1)];
      await supabase
        .from("background_jobs")
        .update({
          status: "pending",
          next_retry_at: new Date(Date.now() + delay).toISOString(),
          output: { fehler: err.message },
        })
        .eq("id", job.id);

      console.log(`[Worker] Job ${job.id} retry in ${delay / 1000}s`);
    } else {
      // Dead Letter
      await supabase
        .from("background_jobs")
        .update({
          status: "dead_letter",
          output: { fehler: err.message },
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      console.log(`[Worker] Job ${job.id} → Dead Letter`);
      await sendWebhook(job.id, "failed", { fehler: err.message });
    }
  }
}

/** Job-Typ-spezifische Verarbeitung */
async function processJob(job) {
  switch (job.type) {
    case "xbau_generate":
      // TODO: Message Builder aufrufen (build-0201, build-0420, etc.)
      // Vorerst Platzhalter — wird bei Migration der Message Builders befüllt
      return { status: "not_yet_implemented", nachrichtentyp: job.input.nachrichtentyp };

    case "xbau_validate":
      // TODO: XSD + Schematron Validierung
      return { status: "not_yet_implemented" };

    case "xbau_parse":
      // TODO: Eingehende Nachricht parsen
      return { status: "not_yet_implemented" };

    default:
      throw new Error(`Unbekannter Job-Typ: ${job.type}`);
  }
}

// -- Main Loop --

console.log(`[XBau-Service] Worker gestartet, Poll-Intervall: ${POLL_INTERVAL_MS}ms`);

async function loop() {
  while (true) {
    try {
      await pollAndProcess();
    } catch (err) {
      console.error("[Worker] Unerwarteter Fehler:", err.message);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

loop();
