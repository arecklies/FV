import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/services/audit";
import { WiedervorlageDbSchema } from "./types";
import type { Wiedervorlage, FaelligeWiedervorlage } from "./types";

/**
 * WiedervorlagenService (PROJ-53)
 *
 * Persoenliche Wiedervorlagen/Erinnerungen zu Vorgaengen.
 * Erhaelt Supabase-Client als Parameter (DI). Kennt kein HTTP.
 *
 * Alle Queries nutzen createServiceRoleClient() mit explizitem tenant_id + user_id Filter.
 */

/** Maximale Anzahl offener Wiedervorlagen pro Vorgang und User */
const MAX_OFFENE_PRO_VORGANG = 20;

/** Standard-Limit fuer Listen-Queries */
const LIST_LIMIT = 100;

// -- createWiedervorlage --

export async function createWiedervorlage(
  serviceClient: SupabaseClient,
  tenantId: string,
  userId: string,
  vorgangId: string,
  data: { faellig_am: string; betreff: string; notiz?: string }
): Promise<{ data: Wiedervorlage | null; error: string | null }> {
  // Limit pruefen: max 20 offene pro Vorgang und User
  const { count, error: countError } = await serviceClient
    .from("wiedervorlagen")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("vorgang_id", vorgangId)
    .is("erledigt_am", null);

  if (countError) {
    return { data: null, error: countError.message };
  }

  if ((count ?? 0) >= MAX_OFFENE_PRO_VORGANG) {
    return {
      data: null,
      error: `Maximal ${MAX_OFFENE_PRO_VORGANG} offene Wiedervorlagen pro Vorgang erlaubt`,
    };
  }

  const { data: inserted, error: insertError } = await serviceClient
    .from("wiedervorlagen")
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      vorgang_id: vorgangId,
      faellig_am: data.faellig_am,
      betreff: data.betreff,
      notiz: data.notiz ?? null,
    })
    .select()
    .single();

  if (insertError) {
    return { data: null, error: insertError.message };
  }

  // Audit-Log
  await writeAuditLog({
    tenantId,
    userId,
    action: "wiedervorlage.created",
    resourceType: "wiedervorlage",
    resourceId: inserted.id,
    payload: {
      vorgang_id: vorgangId,
      faellig_am: data.faellig_am,
      betreff: data.betreff,
    },
  });

  return { data: WiedervorlageDbSchema.parse(inserted), error: null };
}

// -- listWiedervorlagen (alle fuer User + Vorgang) --

export async function listWiedervorlagen(
  serviceClient: SupabaseClient,
  tenantId: string,
  userId: string,
  vorgangId: string
): Promise<{ data: Wiedervorlage[]; error: string | null }> {
  const { data, error } = await serviceClient
    .from("wiedervorlagen")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("vorgang_id", vorgangId)
    .order("faellig_am", { ascending: true })
    .limit(LIST_LIMIT);

  if (error) return { data: [], error: error.message };

  const parsed = (data ?? []).map((d: unknown) => WiedervorlageDbSchema.parse(d));
  return { data: parsed, error: null };
}

// -- listFaelligeWiedervorlagen (User-uebergreifend, mit Vorgang-Aktenzeichen) --

export async function listFaelligeWiedervorlagen(
  serviceClient: SupabaseClient,
  tenantId: string,
  userId: string,
  tageVoraus: number
): Promise<{ data: FaelligeWiedervorlage[]; error: string | null }> {
  // Stichtag berechnen: heute + tageVoraus
  const heute = new Date();
  const stichtag = new Date(heute);
  stichtag.setDate(stichtag.getDate() + tageVoraus);
  const stichtagStr = stichtag.toISOString().split("T")[0];

  const { data, error } = await serviceClient
    .from("wiedervorlagen")
    .select("*, vorgaenge!inner(aktenzeichen, bezeichnung)")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .is("erledigt_am", null)
    .lte("faellig_am", stichtagStr)
    .order("faellig_am", { ascending: true })
    .limit(LIST_LIMIT);

  if (error) return { data: [], error: error.message };

  const result: FaelligeWiedervorlage[] = (data ?? []).map(
    (row: Record<string, unknown>) => {
      const vorgaenge = row.vorgaenge as Record<string, unknown>;
      const { vorgaenge: _v, ...wvData } = row;
      return {
        wiedervorlage: WiedervorlageDbSchema.parse(wvData),
        vorgang_aktenzeichen: vorgaenge.aktenzeichen as string,
        vorgang_bezeichnung: (vorgaenge.bezeichnung as string) ?? null,
      };
    }
  );

  return { data: result, error: null };
}

// -- erledigeWiedervorlage --

export async function erledigeWiedervorlage(
  serviceClient: SupabaseClient,
  tenantId: string,
  userId: string,
  id: string
): Promise<{ data: Wiedervorlage | null; error: string | null }> {
  const { data: updated, error } = await serviceClient
    .from("wiedervorlagen")
    .update({ erledigt_am: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .is("erledigt_am", null)
    .select()
    .single();

  if (error) return { data: null, error: "Wiedervorlage nicht gefunden oder bereits erledigt" };

  return { data: WiedervorlageDbSchema.parse(updated), error: null };
}

// -- deleteWiedervorlage (Hard-Delete, persoenliche Merker) --

export async function deleteWiedervorlage(
  serviceClient: SupabaseClient,
  tenantId: string,
  userId: string,
  id: string
): Promise<{ error: string | null }> {
  // Erst pruefen ob die Wiedervorlage existiert und dem User gehoert
  const { data: existing, error: fetchError } = await serviceClient
    .from("wiedervorlagen")
    .select("id, vorgang_id, betreff")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !existing) {
    return { error: "Wiedervorlage nicht gefunden" };
  }

  const { error: deleteError } = await serviceClient
    .from("wiedervorlagen")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .eq("user_id", userId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  // Audit-Log
  await writeAuditLog({
    tenantId,
    userId,
    action: "wiedervorlage.deleted",
    resourceType: "wiedervorlage",
    resourceId: id,
    payload: {
      vorgang_id: existing.vorgang_id,
      betreff: existing.betreff,
    },
  });

  return { error: null };
}
