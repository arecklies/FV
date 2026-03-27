import { SupabaseClient } from "@supabase/supabase-js";
import type { XBauNachricht, XBauNachrichtListItem, NachrichtRichtung, NachrichtStatus } from "./types";
import { XBauNachrichtDbSchema, XBauNachrichtListItemSchema } from "./types";

/**
 * XBau-Nachrichten-Store (PROJ-7, ADR-015)
 *
 * CRUD auf xbau_nachrichten (Service-Only).
 * Jede Query filtert auf tenant_id.
 */

interface SpeichereNachrichtParams {
  tenantId: string;
  nachrichtenUuid: string;
  nachrichtentyp: string;
  richtung: NachrichtRichtung;
  status: NachrichtStatus;
  rohXml: string;
  kerndaten?: Record<string, unknown>;
  vorgangId?: string;
  referenzUuid?: string;
  bezugNachrichtenUuid?: string;
  bezugAktenzeichen?: string;
  absenderBehoerde?: string;
  empfaengerBehoerde?: string;
  fehlerDetails?: Record<string, unknown>;
}

export async function speichereNachricht(
  serviceClient: SupabaseClient,
  params: SpeichereNachrichtParams
): Promise<{ data: XBauNachricht | null; error: string | null }> {
  const { data, error } = await serviceClient
    .from("xbau_nachrichten")
    .insert({
      tenant_id: params.tenantId,
      nachrichten_uuid: params.nachrichtenUuid,
      nachrichtentyp: params.nachrichtentyp,
      richtung: params.richtung,
      status: params.status,
      roh_xml: params.rohXml,
      kerndaten: params.kerndaten ?? {},
      vorgang_id: params.vorgangId ?? null,
      referenz_uuid: params.referenzUuid ?? null,
      bezug_nachrichten_uuid: params.bezugNachrichtenUuid ?? null,
      bezug_aktenzeichen: params.bezugAktenzeichen ?? null,
      absender_behoerde: params.absenderBehoerde ?? null,
      empfaenger_behoerde: params.empfaengerBehoerde ?? null,
      fehler_details: params.fehlerDetails ?? null,
    })
    .select("id, tenant_id, nachrichten_uuid, nachrichtentyp, richtung, status, vorgang_id, referenz_uuid, bezug_nachrichten_uuid, bezug_aktenzeichen, absender_behoerde, empfaenger_behoerde, kerndaten, fehler_details, created_at, updated_at")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: XBauNachrichtDbSchema.parse(data), error: null };
}

export async function updateNachrichtStatus(
  serviceClient: SupabaseClient,
  tenantId: string,
  nachrichtId: string,
  status: NachrichtStatus,
  vorgangId?: string
): Promise<{ error: string | null }> {
  const updates: Record<string, unknown> = { status };
  if (vorgangId !== undefined) updates.vorgang_id = vorgangId;

  const { error } = await serviceClient
    .from("xbau_nachrichten")
    .update(updates)
    .eq("id", nachrichtId)
    .eq("tenant_id", tenantId);

  return { error: error?.message ?? null };
}

/** Prüft ob eine nachrichtenUUID bereits verarbeitet wurde (Duplikat-Schutz) */
export async function istDuplikat(
  serviceClient: SupabaseClient,
  tenantId: string,
  nachrichtenUuid: string
): Promise<boolean> {
  const { data } = await serviceClient
    .from("xbau_nachrichten")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("nachrichten_uuid", nachrichtenUuid)
    .eq("status", "verarbeitet")
    .limit(1);

  return (data?.length ?? 0) > 0;
}

/** Listet Nachrichten für einen Vorgang (Transportprotokoll) */
export async function listeNachrichtenFuerVorgang(
  serviceClient: SupabaseClient,
  tenantId: string,
  vorgangId: string
): Promise<{ data: XBauNachrichtListItem[]; error: string | null }> {
  const { data, error } = await serviceClient
    .from("xbau_nachrichten")
    .select("id, nachrichten_uuid, nachrichtentyp, richtung, status, vorgang_id, bezug_aktenzeichen, absender_behoerde, empfaenger_behoerde, fehler_details, created_at")
    .eq("tenant_id", tenantId)
    .eq("vorgang_id", vorgangId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return { data: [], error: error.message };
  const parsed = (data ?? []).map((d: unknown) => XBauNachrichtListItemSchema.parse(d));
  return { data: parsed, error: null };
}

/** Listet unzugeordnete Nachrichten (Zuordnungs-Queue) */
export async function listeUnzugeordneteNachrichten(
  serviceClient: SupabaseClient,
  tenantId: string
): Promise<{ data: XBauNachrichtListItem[]; error: string | null }> {
  const { data, error } = await serviceClient
    .from("xbau_nachrichten")
    .select("id, nachrichten_uuid, nachrichtentyp, richtung, status, vorgang_id, bezug_aktenzeichen, absender_behoerde, empfaenger_behoerde, fehler_details, created_at")
    .eq("tenant_id", tenantId)
    .eq("richtung", "eingang")
    .is("vorgang_id", null)
    .in("status", ["empfangen", "verarbeitet"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return { data: [], error: error.message };
  const parsed = (data ?? []).map((d: unknown) => XBauNachrichtListItemSchema.parse(d));
  return { data: parsed, error: null };
}

/** Listet Nachrichten mit Fehlern (Fehler-Queue) */
export async function listeFehlerNachrichten(
  serviceClient: SupabaseClient,
  tenantId: string
): Promise<{ data: XBauNachrichtListItem[]; error: string | null }> {
  const { data, error } = await serviceClient
    .from("xbau_nachrichten")
    .select("id, nachrichten_uuid, nachrichtentyp, richtung, status, vorgang_id, bezug_aktenzeichen, absender_behoerde, empfaenger_behoerde, fehler_details, created_at")
    .eq("tenant_id", tenantId)
    .eq("status", "abgewiesen")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return { data: [], error: error.message };
  const parsed = (data ?? []).map((d: unknown) => XBauNachrichtListItemSchema.parse(d));
  return { data: parsed, error: null };
}

/** Manuell einen Vorgang zuordnen (Zuordnungs-Queue) */
export async function zuordneNachricht(
  serviceClient: SupabaseClient,
  tenantId: string,
  nachrichtId: string,
  vorgangId: string
): Promise<{ error: string | null }> {
  // Prüfe dass Vorgang zum Tenant gehört
  const { data: vorgang } = await serviceClient
    .from("vorgaenge")
    .select("id")
    .eq("id", vorgangId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .single();

  if (!vorgang) {
    return { error: "Vorgang nicht gefunden oder gehört nicht zum Mandanten" };
  }

  const { error } = await serviceClient
    .from("xbau_nachrichten")
    .update({ vorgang_id: vorgangId, status: "verarbeitet" })
    .eq("id", nachrichtId)
    .eq("tenant_id", tenantId);

  return { error: error?.message ?? null };
}
