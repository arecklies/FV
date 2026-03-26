import { z } from "zod";
import { requireAdmin, isAuthContext, type UserRole } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, notFoundError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/lib/services/audit";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/users/[id]
 * Einzelnen Benutzer des eigenen Mandanten abrufen.
 * Erfordert: tenant_admin
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireAdmin();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("tenant_members")
    .select("id, user_id, role, created_at")
    .eq("tenant_id", auth.tenantId)
    .eq("user_id", id)
    .single();

  if (error || !data) {
    return notFoundError("Benutzer nicht gefunden");
  }

  return jsonResponse({ user: data });
}

const UpdateRoleSchema = z.object({
  role: z.enum(["sachbearbeiter", "referatsleiter", "amtsleiter", "tenant_admin"] as const),
});

/**
 * PATCH /api/admin/users/[id]
 * Rolle eines Benutzers aendern.
 * Erfordert: tenant_admin
 * Human-in-the-Loop: Rollenaenderung wird im Audit-Log protokolliert.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;

  // Zod-Validierung
  let body: z.infer<typeof UpdateRoleSchema>;
  try {
    body = UpdateRoleSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      const zodErr = err as z.ZodError;
      const fields: Record<string, string> = {};
      zodErr.issues.forEach((issue) => {
        fields[issue.path.join(".")] = issue.message;
      });
      return validationError(fields);
    }
    return serverError("[PROJ-1] PATCH /api/admin/users/[id]: parse error", err);
  }

  const supabase = createServiceRoleClient();

  // Alten Wert lesen (fuer Audit-Log vorher/nachher)
  const { data: existing } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", auth.tenantId)
    .eq("user_id", id)
    .single();

  if (!existing) {
    return notFoundError("Benutzer nicht gefunden");
  }

  // Rolle aktualisieren
  const { error } = await supabase
    .from("tenant_members")
    .update({ role: body.role as UserRole })
    .eq("tenant_id", auth.tenantId)
    .eq("user_id", id);

  if (error) {
    return serverError("[PROJ-1] role update failed", error);
  }

  // Audit-Log (Rollenaenderung ist sicherheitsrelevant)
  await writeAuditLog({
    tenantId: auth.tenantId,
    userId: auth.userId,
    action: "user.role_changed",
    resourceType: "user",
    resourceId: id,
    payload: {
      previousRole: existing.role,
      newRole: body.role,
    },
  });

  return jsonResponse({
    user: { id, role: body.role },
    message: "Rolle aktualisiert",
  });
}

/**
 * DELETE /api/admin/users/[id]
 * Benutzer aus dem Mandanten entfernen (Soft: nur tenant_members-Eintrag).
 * Erfordert: tenant_admin
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireAdmin();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;

  // Selbstloeschung verhindern
  if (id === auth.userId) {
    return jsonResponse({ error: "Sie können sich nicht selbst entfernen." }, 400);
  }

  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("tenant_members")
    .delete()
    .eq("tenant_id", auth.tenantId)
    .eq("user_id", id);

  if (error) {
    return serverError("[PROJ-1] user removal failed", error);
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    userId: auth.userId,
    action: "user.removed",
    resourceType: "user",
    resourceId: id,
  });

  return jsonResponse({ message: "Benutzer entfernt" });
}
