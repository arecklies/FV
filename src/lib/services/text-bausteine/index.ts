import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/services/audit";
import {
  TextBausteinDbSchema,
  type TextBaustein,
  type ListBausteineFilter,
} from "@/lib/services/bescheid/types";

/**
 * TextBausteinService (PROJ-6 US-2, ADR-003, ADR-006)
 *
 * CRUD fuer Textbaustein-Bibliothek. Mandantenfaehig ueber tenant_id.
 * Erhaelt Supabase-Client als Parameter (DI). Kennt kein HTTP.
 */

const DEFAULT_LIMIT = 100;

/**
 * Listet Textbausteine eines Tenants mit optionalen Filtern.
 */
export async function listBausteine(
  serviceClient: SupabaseClient,
  tenantId: string,
  filter?: ListBausteineFilter
): Promise<{ data: TextBaustein[]; error: string | null }> {
  let query = serviceClient
    .from("text_bausteine")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("kategorie", { ascending: true })
    .order("sortierung", { ascending: true })
    .limit(DEFAULT_LIMIT);

  // Filter: nur aktive
  if (filter?.nur_aktive !== false) {
    query = query.eq("aktiv", true);
  }

  // Filter: Kategorie
  if (filter?.kategorie) {
    query = query.eq("kategorie", filter.kategorie);
  }

  // Filter: Verfahrensart (Array-Contains)
  if (filter?.verfahrensart) {
    query = query.or(
      `verfahrensarten.cs.{${filter.verfahrensart}},verfahrensarten.eq.{}`
    );
  }

  // Filter: Bescheidtyp (Array-Contains)
  if (filter?.bescheidtyp) {
    query = query.or(
      `bescheidtypen.cs.{${filter.bescheidtyp}},bescheidtypen.eq.{}`
    );
  }

  // Filter: Volltextsuche ueber Titel UND Inhalt (US-2 AC-6)
  // ilike-basiert statt textSearch, da Supabase JS Client textSearch nur eine Spalte unterstuetzt
  if (filter?.suche) {
    const escaped = filter.suche.replace(/[%_\\]/g, (c) => `\\${c}`);
    query = query.or(
      `titel.ilike.%${escaped}%,inhalt.ilike.%${escaped}%`
    );
  }

  const { data, error } = await query;

  if (error) return { data: [], error: error.message };
  const parsed = (data ?? []).map((d: unknown) => TextBausteinDbSchema.parse(d));
  return { data: parsed, error: null };
}

/**
 * Laedt einen einzelnen Textbaustein.
 */
export async function getBaustein(
  serviceClient: SupabaseClient,
  tenantId: string,
  id: string
): Promise<{ data: TextBaustein | null; error: string | null }> {
  const { data, error } = await serviceClient
    .from("text_bausteine")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: TextBausteinDbSchema.parse(data), error: null };
}

/**
 * Erstellt einen neuen Textbaustein.
 */
export async function createBaustein(
  serviceClient: SupabaseClient,
  tenantId: string,
  userId: string,
  data: {
    titel: string;
    kategorie: string;
    inhalt: string;
    verfahrensarten?: string[];
    bescheidtypen?: string[];
    sortierung?: number;
  }
): Promise<{ data: TextBaustein | null; error: string | null }> {
  const { data: inserted, error } = await serviceClient
    .from("text_bausteine")
    .insert({
      tenant_id: tenantId,
      titel: data.titel,
      kategorie: data.kategorie,
      inhalt: data.inhalt,
      verfahrensarten: data.verfahrensarten ?? [],
      bescheidtypen: data.bescheidtypen ?? [],
      sortierung: data.sortierung ?? 0,
      created_by: userId,
    })
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };

  const baustein = TextBausteinDbSchema.parse(inserted);

  await writeAuditLog({
    tenantId,
    userId,
    action: "textbaustein.erstellt",
    resourceType: "text_bausteine",
    resourceId: baustein.id,
    payload: { titel: data.titel, kategorie: data.kategorie },
  });

  return { data: baustein, error: null };
}

/**
 * Aktualisiert einen Textbaustein.
 */
export async function updateBaustein(
  serviceClient: SupabaseClient,
  tenantId: string,
  userId: string,
  id: string,
  data: {
    titel?: string;
    kategorie?: string;
    inhalt?: string;
    verfahrensarten?: string[];
    bescheidtypen?: string[];
    sortierung?: number;
    aktiv?: boolean;
  }
): Promise<{ data: TextBaustein | null; error: string | null }> {
  // Nur gesetzte Felder updaten
  const updates: Record<string, unknown> = {};
  if (data.titel !== undefined) updates.titel = data.titel;
  if (data.kategorie !== undefined) updates.kategorie = data.kategorie;
  if (data.inhalt !== undefined) updates.inhalt = data.inhalt;
  if (data.verfahrensarten !== undefined) updates.verfahrensarten = data.verfahrensarten;
  if (data.bescheidtypen !== undefined) updates.bescheidtypen = data.bescheidtypen;
  if (data.sortierung !== undefined) updates.sortierung = data.sortierung;
  if (data.aktiv !== undefined) updates.aktiv = data.aktiv;

  if (Object.keys(updates).length === 0) {
    return { data: null, error: "Keine Felder zum Aktualisieren" };
  }

  const { data: updated, error } = await serviceClient
    .from("text_bausteine")
    .update(updates)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };

  const baustein = TextBausteinDbSchema.parse(updated);

  await writeAuditLog({
    tenantId,
    userId,
    action: "textbaustein.aktualisiert",
    resourceType: "text_bausteine",
    resourceId: id,
    payload: { felder: Object.keys(updates) },
  });

  return { data: baustein, error: null };
}

/**
 * Deaktiviert einen Textbaustein (Soft-Delete).
 * Setzt aktiv=false statt hartem DELETE (US-2 AC-5).
 */
export async function deactivateBaustein(
  serviceClient: SupabaseClient,
  tenantId: string,
  userId: string,
  id: string
): Promise<{ error: string | null }> {
  const { error } = await serviceClient
    .from("text_bausteine")
    .update({ aktiv: false })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { error: error.message };

  await writeAuditLog({
    tenantId,
    userId,
    action: "textbaustein.deaktiviert",
    resourceType: "text_bausteine",
    resourceId: id,
  });

  return { error: null };
}
