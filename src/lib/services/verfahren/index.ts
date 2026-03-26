import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { writeAuditLog } from "@/lib/services/audit";
import { generateAktenzeichen } from "./aktenzeichen";
import type { Vorgang, VorgangListItem, VorgangKommentar, Verfahrensart } from "./types";
import { VerfahrensartDbSchema, VorgangDbSchema, VorgangListItemDbSchema, VorgangKommentarDbSchema } from "./types";

/** Zod-Schema fuer Frist-Batch-Query (B-20-03: statt Type Assertion) */
const FristStatusRowSchema = z.object({
  vorgang_id: z.string(),
  status: z.string(),
});

/** PROJ-20: Laedt dringendsten Frist-Status je Vorgang per Batch-Query */
async function ladeFristStatusBatch(
  serviceClient: SupabaseClient,
  tenantId: string,
  vorgangIds: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (vorgangIds.length === 0) return result;

  const { data } = await serviceClient
    .from("vorgang_fristen")
    .select("vorgang_id, status")
    .eq("tenant_id", tenantId)
    .eq("aktiv", true)
    .in("vorgang_id", vorgangIds)
    .limit(2000);

  if (!data) return result;

  const AMPEL_PRIO: Record<string, number> = { dunkelrot: 0, rot: 1, gelb: 2, gehemmt: 3, gruen: 4 };
  for (const row of data) {
    const parsed = FristStatusRowSchema.parse(row);
    const existing = result.get(parsed.vorgang_id);
    if (!existing || (AMPEL_PRIO[parsed.status] ?? 5) < (AMPEL_PRIO[existing] ?? 5)) {
      result.set(parsed.vorgang_id, parsed.status);
    }
  }

  return result;
}

/**
 * VerfahrenService (ADR-003, ADR-012, PROJ-3)
 *
 * Fachlogik fuer Vorgangsverwaltung. Erhaelt Supabase-Client als Parameter (DI).
 * Kennt kein HTTP — wird von API-Routes aufgerufen.
 */

const MAX_RETRIES = 3;

// -- Verfahrensarten (Service-Only, ADR-006) --

export async function listVerfahrensarten(
  serviceClient: SupabaseClient,
  bundesland: string
): Promise<{ data: Verfahrensart[] | null; error: string | null }> {
  const { data, error } = await serviceClient
    .from("config_verfahrensarten")
    .select("id, bundesland, kuerzel, bezeichnung, kategorie, sortierung, rechtsgrundlage")
    .eq("bundesland", bundesland)
    .eq("aktiv", true)
    .order("sortierung", { ascending: true })
    .limit(100);

  if (error) return { data: null, error: error.message };
  const parsed = (data ?? []).map((d: unknown) => VerfahrensartDbSchema.parse(d));
  return { data: parsed, error: null };
}

export async function getVerfahrensart(
  serviceClient: SupabaseClient,
  id: string
): Promise<Verfahrensart | null> {
  const { data } = await serviceClient
    .from("config_verfahrensarten")
    .select("id, bundesland, kuerzel, bezeichnung, kategorie, sortierung, rechtsgrundlage")
    .eq("id", id)
    .single();

  if (!data) return null;
  return VerfahrensartDbSchema.parse(data);
}

// -- Vorgaenge (mandantenfaehig, RLS ueber Client) --

interface CreateVorgangParams {
  tenantId: string;
  userId: string;
  verfahrensart_id: string;
  bauherr_name: string;
  bauherr_anschrift?: string;
  bauherr_telefon?: string;
  bauherr_email?: string;
  grundstueck_adresse?: string;
  grundstueck_flurstueck?: string;
  grundstueck_gemarkung?: string;
  bezeichnung?: string;
  extra_felder?: Record<string, unknown>;
}

export async function createVorgang(
  serviceClient: SupabaseClient,
  params: CreateVorgangParams
): Promise<{ data: Vorgang | null; error: string | null }> {
  // 1. Verfahrensart laden (fuer Kuerzel + Bundesland)
  const verfahrensart = await getVerfahrensart(serviceClient, params.verfahrensart_id);
  if (!verfahrensart) {
    return { data: null, error: "Verfahrensart nicht gefunden" };
  }

  // 2. Tenant-Settings laden (Aktenzeichen-Schema)
  const { data: tenant } = await serviceClient
    .from("tenants")
    .select("settings, bundesland")
    .eq("id", params.tenantId)
    .single();

  const aktenzeichenSchema = (tenant?.settings as Record<string, unknown>)?.aktenzeichen_schema as string | undefined;
  const bundesland = tenant?.bundesland ?? verfahrensart.bundesland;

  // 3. Aktenzeichen generieren (mit Retry bei Race Condition)
  const jahr = new Date().getFullYear();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Naechste Laufnummer ermitteln
    const { data: maxResult } = await serviceClient
      .from("vorgaenge")
      .select("aktenzeichen")
      .eq("tenant_id", params.tenantId)
      .like("aktenzeichen", `${jahr}/%`)
      .order("created_at", { ascending: false })
      .limit(1);

    let laufnummer = 1;
    if (maxResult && maxResult.length > 0) {
      const parts = maxResult[0].aktenzeichen.split("/");
      const lastNr = parseInt(parts[1], 10);
      if (!isNaN(lastNr)) laufnummer = lastNr + 1;
    }

    const aktenzeichen = generateAktenzeichen(
      aktenzeichenSchema,
      jahr,
      laufnummer,
      verfahrensart.kuerzel
    );

    // 4. Vorgang einfuegen
    const { data, error } = await serviceClient
      .from("vorgaenge")
      .insert({
        tenant_id: params.tenantId,
        aktenzeichen,
        verfahrensart_id: params.verfahrensart_id,
        bundesland,
        bauherr_name: params.bauherr_name,
        bauherr_anschrift: params.bauherr_anschrift ?? null,
        bauherr_telefon: params.bauherr_telefon ?? null,
        bauherr_email: params.bauherr_email ?? null,
        grundstueck_adresse: params.grundstueck_adresse ?? null,
        grundstueck_flurstueck: params.grundstueck_flurstueck ?? null,
        grundstueck_gemarkung: params.grundstueck_gemarkung ?? null,
        bezeichnung: params.bezeichnung ?? null,
        workflow_schritt_id: "eingegangen",
        zustaendiger_user_id: params.userId,
        created_by: params.userId,
        extra_felder: params.extra_felder ?? {},
      })
      .select()
      .single();

    if (error) {
      // UNIQUE Constraint Violation = Race Condition, retry
      if (error.code === "23505" && attempt < MAX_RETRIES - 1) continue;
      return { data: null, error: error.message };
    }

    // 5. Initialen Workflow-Schritt protokollieren
    const { error: workflowError } = await serviceClient.from("vorgang_workflow_schritte").insert({
      tenant_id: params.tenantId,
      vorgang_id: data.id,
      schritt_id: "eingegangen",
      aktion_id: null,
      ausgefuehrt_von: params.userId,
    });
    if (workflowError) {
      console.error("[PROJ-3] Workflow-Schritt-Insert fehlgeschlagen", workflowError.message);
    }

    // 6. Audit-Log
    await writeAuditLog({
      tenantId: params.tenantId,
      userId: params.userId,
      action: "vorgang.created",
      resourceType: "vorgang",
      resourceId: data.id,
      payload: { aktenzeichen, verfahrensart: verfahrensart.bezeichnung },
    });

    return { data: VorgangDbSchema.parse(data), error: null };
  }

  return { data: null, error: "Aktenzeichen konnte nicht vergeben werden (zu viele Konflikte)" };
}

interface ListVorgaengeParams {
  tenantId: string;
  status?: string;
  verfahrensart_id?: string;
  zustaendiger_user_id?: string;
  suche?: string;
  sortierung?: string;
  richtung?: string;
  seite?: number;
  pro_seite?: number;
}

export async function listVorgaenge(
  serviceClient: SupabaseClient,
  params: ListVorgaengeParams
): Promise<{ data: VorgangListItem[]; total: number; error: string | null }> {
  const seite = params.seite ?? 1;
  const proSeite = params.pro_seite ?? 25;
  const offset = (seite - 1) * proSeite;

  let query = serviceClient
    .from("vorgaenge")
    .select(
      "id, aktenzeichen, bauherr_name, grundstueck_adresse, bezeichnung, workflow_schritt_id, zustaendiger_user_id, eingangsdatum, verfahrensart_id",
      { count: "exact" }
    )
    .eq("tenant_id", params.tenantId)
    .is("deleted_at", null);

  // Filter
  if (params.status) {
    query = query.eq("workflow_schritt_id", params.status);
  }
  if (params.verfahrensart_id) {
    query = query.eq("verfahrensart_id", params.verfahrensart_id);
  }
  if (params.zustaendiger_user_id) {
    query = query.eq("zustaendiger_user_id", params.zustaendiger_user_id);
  }

  // Volltextsuche (PostgreSQL tsvector)
  if (params.suche) {
    query = query.textSearch(
      "aktenzeichen",
      params.suche,
      { type: "websearch", config: "german" }
    );
  }

  const ascending = params.richtung === "asc";
  const isFristSort = params.sortierung === "frist_status";

  if (!isFristSort) {
    // Standard-Sortierung: DB-seitig + Paginierung
    const sortCol = params.sortierung ?? "eingangsdatum";
    query = query.order(sortCol, { ascending });
    query = query.range(offset, offset + proSeite - 1);

    const { data, count, error } = await query;
    if (error) return { data: [], total: 0, error: error.message };

    const vorgangIds = (data ?? []).map((d: Record<string, unknown>) => d.id as string);
    const fristStatusMap = await ladeFristStatusBatch(serviceClient, params.tenantId, vorgangIds);

    const parsed = (data ?? []).map((d: unknown) => {
      const item = VorgangListItemDbSchema.parse(d);
      return { ...item, frist_status: fristStatusMap.get(item.id) ?? null };
    });

    return { data: parsed, total: count ?? 0, error: null };
  }

  // PROJ-20 US-2: Frist-Sortierung — IDs laden, Frist-Status berechnen, sortieren, dann paginieren
  // B-20-01 Fix: Sortierung VOR Paginierung auf vollstaendigem Ergebnis
  query = query.order("eingangsdatum", { ascending: false });
  const { data: alleData, count, error } = await query.limit(1000);
  if (error) return { data: [], total: 0, error: error.message };

  const alleIds = (alleData ?? []).map((d: Record<string, unknown>) => d.id as string);
  const fristStatusMap = await ladeFristStatusBatch(serviceClient, params.tenantId, alleIds);

  // B-20-02 Fix: Korrekte Sortierrichtung (desc = dringendste zuerst)
  const SORT_PRIO: Record<string, number> = { dunkelrot: 0, rot: 1, gelb: 2, gehemmt: 3, gruen: 4 };
  const nullPrio = 5;
  const sortiert = (alleData ?? []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
    const sa = fristStatusMap.get(a.id as string);
    const sb = fristStatusMap.get(b.id as string);
    const pa = sa ? (SORT_PRIO[sa] ?? nullPrio) : nullPrio;
    const pb = sb ? (SORT_PRIO[sb] ?? nullPrio) : nullPrio;
    return ascending ? pa - pb : pb - pa;
  });

  // Paginierung auf sortiertes Ergebnis anwenden
  const paginiert = sortiert.slice(offset, offset + proSeite);
  const parsed = paginiert.map((d: unknown) => {
    const item = VorgangListItemDbSchema.parse(d);
    return { ...item, frist_status: fristStatusMap.get(item.id) ?? null };
  });

  return { data: parsed, total: count ?? 0, error: null };
}

export async function getVorgang(
  serviceClient: SupabaseClient,
  tenantId: string,
  vorgangId: string
): Promise<{ data: Vorgang | null; error: string | null }> {
  const { data, error } = await serviceClient
    .from("vorgaenge")
    .select("*")
    .eq("id", vorgangId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: VorgangDbSchema.parse(data), error: null };
}

interface UpdateVorgangParams {
  tenantId: string;
  userId: string;
  vorgangId: string;
  version: number;
  updates: Record<string, unknown>;
}

export async function updateVorgang(
  serviceClient: SupabaseClient,
  params: UpdateVorgangParams
): Promise<{ data: Vorgang | null; error: string | null; conflict: boolean }> {
  const { data, error } = await serviceClient
    .from("vorgaenge")
    .update({ ...params.updates, version: params.version + 1 })
    .eq("id", params.vorgangId)
    .eq("tenant_id", params.tenantId)
    .eq("version", params.version)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) {
    // PGRST116 = no rows returned = version mismatch (Optimistic Lock)
    if (error.code === "PGRST116") {
      return { data: null, error: "Vorgang wurde zwischenzeitlich geändert. Bitte laden Sie die Seite neu.", conflict: true };
    }
    return { data: null, error: error.message, conflict: false };
  }

  await writeAuditLog({
    tenantId: params.tenantId,
    userId: params.userId,
    action: "vorgang.updated",
    resourceType: "vorgang",
    resourceId: params.vorgangId,
    payload: { fields: Object.keys(params.updates) },
  });

  return { data: VorgangDbSchema.parse(data), error: null, conflict: false };
}

export async function softDeleteVorgang(
  serviceClient: SupabaseClient,
  tenantId: string,
  userId: string,
  vorgangId: string
): Promise<{ error: string | null }> {
  // Soft-Delete via Service-Role (backend.md: Soft-Delete + RLS Workaround)
  const { error } = await serviceClient
    .from("vorgaenge")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", vorgangId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  if (error) return { error: error.message };

  await writeAuditLog({
    tenantId,
    userId,
    action: "vorgang.deleted",
    resourceType: "vorgang",
    resourceId: vorgangId,
  });

  return { error: null };
}

export async function zuweiseVorgang(
  serviceClient: SupabaseClient,
  tenantId: string,
  userId: string,
  vorgangId: string,
  neuerZustaendigerUserId: string
): Promise<{ error: string | null }> {
  // Pruefen ob Zielbenutzer im selben Tenant ist
  const { data: member } = await serviceClient
    .from("tenant_members")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("user_id", neuerZustaendigerUserId)
    .single();

  if (!member) {
    return { error: "Zielbenutzer gehört nicht zum selben Mandanten" };
  }

  const { error } = await serviceClient
    .from("vorgaenge")
    .update({ zustaendiger_user_id: neuerZustaendigerUserId })
    .eq("id", vorgangId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  if (error) return { error: error.message };

  await writeAuditLog({
    tenantId,
    userId,
    action: "vorgang.zugewiesen",
    resourceType: "vorgang",
    resourceId: vorgangId,
    payload: { neuer_zustaendiger: neuerZustaendigerUserId },
  });

  return { error: null };
}

// -- Kommentare (PROJ-3 FA-9, US-4) --

export async function listKommentare(
  serviceClient: SupabaseClient,
  tenantId: string,
  vorgangId: string
): Promise<{ data: VorgangKommentar[]; error: string | null }> {
  const { data, error } = await serviceClient
    .from("vorgang_kommentare")
    .select("id, vorgang_id, autor_user_id, inhalt, created_at")
    .eq("tenant_id", tenantId)
    .eq("vorgang_id", vorgangId)
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) return { data: [], error: error.message };
  const parsed = (data ?? []).map((d: unknown) => VorgangKommentarDbSchema.parse(d));
  return { data: parsed, error: null };
}

export async function createKommentar(
  serviceClient: SupabaseClient,
  tenantId: string,
  userId: string,
  vorgangId: string,
  inhalt: string
): Promise<{ data: VorgangKommentar | null; error: string | null }> {
  const { data, error } = await serviceClient
    .from("vorgang_kommentare")
    .insert({
      tenant_id: tenantId,
      vorgang_id: vorgangId,
      autor_user_id: userId,
      inhalt,
    })
    .select("id, vorgang_id, autor_user_id, inhalt, created_at")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: VorgangKommentarDbSchema.parse(data), error: null };
}
