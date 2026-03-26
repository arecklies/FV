import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, serverError } from "@/lib/api/errors";
import { writeAuditLog } from "@/lib/services/audit";

const LoginSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein"),
});

/**
 * POST /api/auth/login
 * Anonym (kein requireAuth) -- Login-Endpunkt.
 * Setzt Cookie `sb-access-token` bei Erfolg.
 */
export async function POST(request: NextRequest) {
  // 1. Zod-Validierung
  let body: z.infer<typeof LoginSchema>;
  try {
    body = LoginSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      const zodErr = err as z.ZodError;
      const fields: Record<string, string> = {};
      zodErr.issues.forEach((issue) => {
        fields[issue.path.join(".")] = issue.message;
      });
      return validationError(fields);
    }
    return serverError("Login: JSON parse error", err);
  }

  // 2. Supabase Auth: Login
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  if (error || !data.session) {
    // Keine internen Details an Client (security.md: Error-Leakage-Verbot)
    await writeAuditLog({
      tenantId: null,
      userId: null,
      action: "auth.login_failed",
      resourceType: "auth",
      payload: { email: body.email, reason: "invalid_credentials" },
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });
    return jsonResponse({ error: "E-Mail oder Passwort ist falsch." }, 401);
  }

  // 3. Audit-Log
  await writeAuditLog({
    tenantId: null, // tenant_id wird im Session-Endpunkt aufgeloest
    userId: data.user.id,
    action: "auth.login_success",
    resourceType: "auth",
    payload: { email: body.email },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  // 4. Cookie setzen und Session zurueckgeben
  const response = jsonResponse({
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });

  // sb-access-token Cookie fuer SSR (backend.md: Cookie-Synchronisation)
  const cookieHeader = `sb-access-token=${data.session.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${data.session.expires_in}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

  return new Response(response.body, {
    status: response.status,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      "Set-Cookie": cookieHeader,
    },
  });
}
