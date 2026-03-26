import { createServiceRoleClient } from "@/lib/supabase-server";

/**
 * Audit-Log schreiben (ADR-005 Stufe 1).
 * EINZIGER erlaubter Zugriffspunkt auf die audit_log-Tabelle.
 * Keine direkten .from("audit_log").insert() -- immer diese Funktion verwenden.
 */
export async function writeAuditLog(params: {
  tenantId: string | null;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId?: string;
  payload?: Record<string, unknown>;
  ipAddress?: string;
}) {
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("audit_log").insert({
    tenant_id: params.tenantId,
    user_id: params.userId,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId ?? null,
    payload: params.payload ?? {},
    ip_address: params.ipAddress ?? null,
  });

  if (error) {
    // Audit-Log-Fehler duerfen NICHT den Request blockieren,
    // aber MUESSEN geloggt werden (ADR-005).
    console.error("[AUDIT_LOG_ERROR]", error.message, params);
  }
}
