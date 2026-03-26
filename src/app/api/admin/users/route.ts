import { z } from "zod";
import { requireAdmin, isAuthContext, type UserRole } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/lib/services/audit";

/**
 * GET /api/admin/users
 * Alle Benutzer des eigenen Mandanten auflisten.
 * Erfordert: tenant_admin
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!isAuthContext(auth)) return auth;

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("tenant_members")
    .select("id, user_id, role, created_at")
    .eq("tenant_id", auth.tenantId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    return serverError("[PROJ-1] GET /api/admin/users failed", error);
  }

  // B-001: E-Mail aus auth.users laden (Service-Role kann admin.listUsers)
  const userIds = (data ?? []).map((m: { user_id: string }) => m.user_id);
  const emailMap: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: authUsers } = await supabase.auth.admin.listUsers({
      perPage: 200,
    });
    if (authUsers?.users) {
      authUsers.users.forEach((u) => {
        if (userIds.includes(u.id)) {
          emailMap[u.id] = u.email ?? "";
        }
      });
    }
  }

  const usersWithEmail = (data ?? []).map((m: { id: string; user_id: string; role: string; created_at: string }) => ({
    ...m,
    email: emailMap[m.user_id] ?? "",
  }));

  return jsonResponse({ users: usersWithEmail });
}

const CreateUserSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein"),
  role: z.enum(["sachbearbeiter", "referatsleiter", "amtsleiter", "tenant_admin"] as const),
});

/**
 * POST /api/admin/users
 * Neuen Benutzer anlegen und dem eigenen Mandanten zuordnen.
 * Erfordert: tenant_admin
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!isAuthContext(auth)) return auth;

  // Zod-Validierung
  let body: z.infer<typeof CreateUserSchema>;
  try {
    body = CreateUserSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      const zodErr = err as z.ZodError;
      const fields: Record<string, string> = {};
      zodErr.issues.forEach((issue) => {
        fields[issue.path.join(".")] = issue.message;
      });
      return validationError(fields);
    }
    return serverError("[PROJ-1] POST /api/admin/users: parse error", err);
  }

  const supabase = createServiceRoleClient();

  // 1. Supabase Auth: Benutzer anlegen
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
  });

  if (createError || !newUser.user) {
    // Keine internen Details an Client
    console.error("[PROJ-1] createUser failed", createError?.message);
    return jsonResponse({ error: "Benutzer konnte nicht angelegt werden." }, 409);
  }

  // 2. tenant_members: Zuordnung zum Mandanten
  const { error: memberError } = await supabase.from("tenant_members").insert({
    tenant_id: auth.tenantId,
    user_id: newUser.user.id,
    role: body.role as UserRole,
  });

  if (memberError) {
    return serverError("[PROJ-1] tenant_members insert failed", memberError);
  }

  // 3. Audit-Log
  await writeAuditLog({
    tenantId: auth.tenantId,
    userId: auth.userId,
    action: "user.created",
    resourceType: "user",
    resourceId: newUser.user.id,
    payload: { email: body.email, role: body.role },
  });

  return jsonResponse({
    user: {
      id: newUser.user.id,
      email: newUser.user.email,
      role: body.role,
    },
  }, 201);
}
