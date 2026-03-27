import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

/**
 * Background-Jobs Service (ADR-008, ADR-015)
 *
 * CRUD für die background_jobs-Tabelle.
 * Wird vom Fachverfahren genutzt um XBau-Aufträge zu erstellen.
 */

// -- Zod-Schemas --

export const BackgroundJobDbSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  type: z.string(),
  status: z.string(),
  input: z.record(z.string(), z.unknown()),
  output: z.record(z.string(), z.unknown()).nullable(),
  attempts: z.number(),
  max_attempts: z.number(),
  next_retry_at: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  webhook_url: z.string().nullable(),
  webhook_delivered: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type BackgroundJob = z.infer<typeof BackgroundJobDbSchema>;

// -- Retry-Delays (E3: 30s/60s/120s) --

const RETRY_DELAYS_MS = [30_000, 60_000, 120_000];

function berechneNaechstenRetry(attempts: number): string | null {
  if (attempts >= RETRY_DELAYS_MS.length) return null;
  const delay = RETRY_DELAYS_MS[attempts];
  return new Date(Date.now() + delay).toISOString();
}

// -- Service-Funktionen --

interface ErstelleJobParams {
  tenantId: string;
  type: string;
  input: Record<string, unknown>;
  webhookUrl?: string;
}

/** Erstellt einen neuen Background-Job */
export async function erstelleJob(
  serviceClient: SupabaseClient,
  params: ErstelleJobParams
): Promise<{ data: BackgroundJob | null; error: string | null }> {
  const { data, error } = await serviceClient
    .from("background_jobs")
    .insert({
      tenant_id: params.tenantId,
      type: params.type,
      status: "pending",
      input: params.input,
      webhook_url: params.webhookUrl ?? null,
    })
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: BackgroundJobDbSchema.parse(data), error: null };
}

/** Holt den nächsten ausstehenden Job (für Worker) */
export async function holeNaechstenJob(
  serviceClient: SupabaseClient,
  type?: string
): Promise<{ data: BackgroundJob | null; error: string | null }> {
  let query = serviceClient
    .from("background_jobs")
    .select("*")
    .eq("status", "pending")
    .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
    .order("created_at", { ascending: true })
    .limit(1);

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query.single();

  if (error && error.code === "PGRST116") {
    // Kein Job verfügbar
    return { data: null, error: null };
  }
  if (error) return { data: null, error: error.message };

  // Atomisch auf 'processing' setzen
  const { data: updated, error: updateError } = await serviceClient
    .from("background_jobs")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
      attempts: (data as Record<string, unknown>).attempts as number + 1,
    })
    .eq("id", (data as Record<string, unknown>).id)
    .eq("status", "pending")
    .select("*")
    .single();

  if (updateError) return { data: null, error: updateError.message };
  return { data: BackgroundJobDbSchema.parse(updated), error: null };
}

/** Markiert einen Job als abgeschlossen */
export async function schliesseJobAb(
  serviceClient: SupabaseClient,
  jobId: string,
  status: "completed" | "failed",
  output?: Record<string, unknown>
): Promise<{ error: string | null }> {
  const updates: Record<string, unknown> = {
    status,
    completed_at: new Date().toISOString(),
  };
  if (output) updates.output = output;

  // Bei Fehler: Retry berechnen oder Dead-Letter
  if (status === "failed") {
    const { data: job } = await serviceClient
      .from("background_jobs")
      .select("attempts, max_attempts")
      .eq("id", jobId)
      .single();

    if (job) {
      const attempts = (job as Record<string, unknown>).attempts as number;
      const maxAttempts = (job as Record<string, unknown>).max_attempts as number;

      if (attempts < maxAttempts) {
        updates.status = "pending";
        updates.completed_at = null;
        updates.next_retry_at = berechneNaechstenRetry(attempts);
      } else {
        updates.status = "dead_letter";
      }
    }
  }

  const { error } = await serviceClient
    .from("background_jobs")
    .update(updates)
    .eq("id", jobId);

  return { error: error?.message ?? null };
}

/** Listet Jobs eines Tenants (für Status-Anzeige) */
export async function listeJobs(
  serviceClient: SupabaseClient,
  tenantId: string,
  type?: string,
  status?: string
): Promise<{ data: BackgroundJob[]; error: string | null }> {
  let query = serviceClient
    .from("background_jobs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (type) query = query.eq("type", type);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) return { data: [], error: error.message };
  const parsed = (data ?? []).map((d: unknown) => BackgroundJobDbSchema.parse(d));
  return { data: parsed, error: null };
}
