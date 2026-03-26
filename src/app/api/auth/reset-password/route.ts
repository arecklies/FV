import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, serverError } from "@/lib/api/errors";

const ResetPasswordSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
});

/**
 * POST /api/auth/reset-password
 * Anonym (kein requireAuth) -- Passwort-Reset-Endpunkt.
 * Sendet Reset-E-Mail ueber Supabase Auth.
 * Gibt immer 200 zurueck (verhindert User-Enumeration).
 */
export async function POST(request: Request) {
  let body: z.infer<typeof ResetPasswordSchema>;
  try {
    body = ResetPasswordSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      const fields: Record<string, string> = {};
      err.issues.forEach((issue) => {
        fields[issue.path.join(".")] = issue.message;
      });
      return validationError(fields);
    }
    return serverError("[PROJ-1] POST /api/auth/reset-password: parse error", err);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  // Immer 200 zurueckgeben — verhindert User-Enumeration (security.md)
  const { error } = await supabase.auth.resetPasswordForEmail(body.email);
  if (error) {
    console.error("[PROJ-1] resetPasswordForEmail failed", error.message);
  }

  return jsonResponse({
    message: "Falls ein Konto mit dieser E-Mail existiert, erhalten Sie eine Nachricht.",
  });
}
