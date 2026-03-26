import { createServerClient, createServiceRoleClient } from "@/lib/supabase-server";
import { unauthorizedError, forbiddenError } from "./errors";

/**
 * Rollen-Typen (ADR-002 RBAC-Modell)
 */
export type UserRole =
  | "sachbearbeiter"
  | "referatsleiter"
  | "amtsleiter"
  | "tenant_admin"
  | "platform_admin";

/**
 * Rollen-Hierarchie (ADR-002): Hoehere Nummer = hoehere Berechtigung.
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  sachbearbeiter: 1,
  referatsleiter: 2,
  amtsleiter: 3,
  tenant_admin: 4,
  platform_admin: 5,
};

export function hasMinRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Auth-Kontext: Ergebnis von requireAuth().
 */
export interface AuthContext {
  userId: string;
  email: string;
  tenantId: string;
  role: UserRole;
}

/**
 * Authentifizierung pruefen (PFLICHT in jeder geschuetzten API-Route).
 * Gibt AuthContext zurueck oder wirft Response.
 *
 * Ablauf:
 * 1. Supabase-Session aus Cookie pruefen
 * 2. tenant_id und role aus tenant_members laden (Service-Role)
 * 3. AuthContext zurueckgeben
 */
export async function requireAuth(): Promise<AuthContext | Response> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return unauthorizedError();
  }

  // Tenant und Rolle aus tenant_members laden (Service-Role, da deny-all RLS)
  const serviceClient = createServiceRoleClient();
  const { data: membership, error: memberError } = await serviceClient
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (memberError || !membership) {
    return forbiddenError("Kein Mandant zugeordnet. Bitte wenden Sie sich an Ihren Administrator.");
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    tenantId: membership.tenant_id,
    role: membership.role as UserRole,
  };
}

/**
 * Rollen-Check: Mindestrolle pruefen (ADR-002).
 * Nutzt requireAuth() intern.
 */
export async function requireRole(minRole: UserRole): Promise<AuthContext | Response> {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  if (!hasMinRole(authResult.role, minRole)) {
    return forbiddenError("Unzureichende Berechtigung für diese Aktion.");
  }

  return authResult;
}

/**
 * Convenience: Mindestens Tenant-Admin.
 */
export async function requireAdmin(): Promise<AuthContext | Response> {
  return requireRole("tenant_admin");
}

/**
 * Convenience: Mindestens Referatsleiter.
 */
export async function requireReferatsleiter(): Promise<AuthContext | Response> {
  return requireRole("referatsleiter");
}

/**
 * Hilfsfunktion: Pruefen ob authResult ein AuthContext ist (kein Response).
 */
export function isAuthContext(result: AuthContext | Response): result is AuthContext {
  return !(result instanceof Response);
}
