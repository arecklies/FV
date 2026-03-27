import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/services/audit";
import type { UserRole } from "@/lib/api/auth";
import { hasMinRole } from "@/lib/api/auth";
import { VertretungDbSchema } from "./types";
import type { Vertretung } from "./types";

/**
 * StellvertreterService (ADR-013, ADR-003)
 *
 * CRUD und Validierung fuer Freigabe-Stellvertretungen.
 * Service-Only: Zugriff ueber Service-Role-Client.
 */

const MIN_ROLE_STELLVERTRETER: UserRole = "referatsleiter";

/**
 * Alle Stellvertreter eines Referatsleiters laden.
 */
export async function getStellvertreterFuer(
  serviceClient: SupabaseClient,
  tenantId: string,
  vertretenerId: string
): Promise<{ data: Vertretung[]; error: string | null }> {
  const { data, error } = await serviceClient
    .from("freigabe_stellvertreter")
    .select("id, tenant_id, vertretener_id, stellvertreter_id, created_at")
    .eq("tenant_id", tenantId)
    .eq("vertretener_id", vertretenerId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) return { data: [], error: error.message };
  const parsed = (data ?? []).map((d: unknown) => VertretungDbSchema.parse(d));
  return { data: parsed, error: null };
}

/**
 * Alle Vertretungen die ein User hat (wen vertritt er?).
 */
export async function getVertretungenVon(
  serviceClient: SupabaseClient,
  tenantId: string,
  stellvertreterId: string
): Promise<{ data: Vertretung[]; error: string | null }> {
  const { data, error } = await serviceClient
    .from("freigabe_stellvertreter")
    .select("id, tenant_id, vertretener_id, stellvertreter_id, created_at")
    .eq("tenant_id", tenantId)
    .eq("stellvertreter_id", stellvertreterId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) return { data: [], error: error.message };
  const parsed = (data ?? []).map((d: unknown) => VertretungDbSchema.parse(d));
  return { data: parsed, error: null };
}

/**
 * Alle Vertretungen im Mandanten (Admin-Ansicht).
 */
export async function getAlleVertretungen(
  serviceClient: SupabaseClient,
  tenantId: string
): Promise<{ data: Vertretung[]; error: string | null }> {
  const { data, error } = await serviceClient
    .from("freigabe_stellvertreter")
    .select("id, tenant_id, vertretener_id, stellvertreter_id, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return { data: [], error: error.message };
  const parsed = (data ?? []).map((d: unknown) => VertretungDbSchema.parse(d));
  return { data: parsed, error: null };
}

/**
 * IDs aller Referatsleiter die ein Stellvertreter vertritt.
 * Fuer Freigabeliste-Erweiterung (AC-2.1, AC-2.6).
 */
export async function getVertreteneReferatsleiterIds(
  serviceClient: SupabaseClient,
  tenantId: string,
  stellvertreterId: string
): Promise<string[]> {
  const { data } = await serviceClient
    .from("freigabe_stellvertreter")
    .select("vertretener_id")
    .eq("tenant_id", tenantId)
    .eq("stellvertreter_id", stellvertreterId)
    .limit(50);

  return (data ?? []).map((d: { vertretener_id: string }) => d.vertretener_id);
}

/**
 * Vertretung anlegen mit Rollen-Validierung.
 */
export async function createVertretung(
  serviceClient: SupabaseClient,
  params: {
    tenantId: string;
    vertretenerId: string;
    stellvertreterId: string;
    auditUserId: string;
  }
): Promise<{ data: Vertretung | null; error: string | null }> {
  const { tenantId, vertretenerId, stellvertreterId, auditUserId } = params;

  // AC-1.6: Keine Selbstzuordnung
  if (vertretenerId === stellvertreterId) {
    return { data: null, error: "Selbstzuordnung ist nicht möglich" };
  }

  // AC-1.2: Stellvertreter muss Rolle >= referatsleiter haben
  const { data: stMember } = await serviceClient
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", stellvertreterId)
    .limit(1)
    .single();

  if (!stMember) {
    return { data: null, error: "Stellvertreter nicht im Mandanten gefunden" };
  }

  if (!hasMinRole(stMember.role as UserRole, MIN_ROLE_STELLVERTRETER)) {
    return { data: null, error: "Stellvertreter muss mindestens Referatsleiter sein" };
  }

  // INSERT
  const { data, error } = await serviceClient
    .from("freigabe_stellvertreter")
    .insert({
      tenant_id: tenantId,
      vertretener_id: vertretenerId,
      stellvertreter_id: stellvertreterId,
    })
    .select("id, tenant_id, vertretener_id, stellvertreter_id, created_at")
    .single();

  if (error) {
    // UNIQUE-Constraint-Verletzung
    if (error.code === "23505") {
      return { data: null, error: "Diese Vertretungszuordnung existiert bereits" };
    }
    return { data: null, error: error.message };
  }

  const parsed = VertretungDbSchema.parse(data);

  // AC-1.7: Audit-Trail
  await writeAuditLog({
    tenantId,
    userId: auditUserId,
    action: "vertretung.erstellt",
    resourceType: "freigabe_stellvertreter",
    resourceId: parsed.id,
    payload: {
      vertretener_id: vertretenerId,
      stellvertreter_id: stellvertreterId,
    },
  });

  return { data: parsed, error: null };
}

/**
 * Vertretung loeschen (durch Referatsleiter oder Admin).
 */
export async function deleteVertretung(
  serviceClient: SupabaseClient,
  params: {
    tenantId: string;
    vertretungId: string;
    auditUserId: string;
    auditAction: "vertretung.entfernt" | "vertretung.admin_entfernt";
  }
): Promise<{ error: string | null }> {
  const { tenantId, vertretungId, auditUserId, auditAction } = params;

  // Vertretung laden fuer Audit-Log-Payload
  const { data: existing } = await serviceClient
    .from("freigabe_stellvertreter")
    .select("id, vertretener_id, stellvertreter_id")
    .eq("id", vertretungId)
    .eq("tenant_id", tenantId)
    .limit(1)
    .single();

  if (!existing) {
    return { error: "Vertretung nicht gefunden" };
  }

  const { error } = await serviceClient
    .from("freigabe_stellvertreter")
    .delete()
    .eq("id", vertretungId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { error: error.message };
  }

  // AC-1.8 / AC-3.2: Audit-Trail
  await writeAuditLog({
    tenantId,
    userId: auditUserId,
    action: auditAction,
    resourceType: "freigabe_stellvertreter",
    resourceId: vertretungId,
    payload: {
      vertretener_id: existing.vertretener_id,
      stellvertreter_id: existing.stellvertreter_id,
    },
  });

  return { error: null };
}
