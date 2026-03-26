import { createServerClient } from "@/lib/supabase-server";
import { jsonResponse } from "@/lib/api/security-headers";
import { serverError } from "@/lib/api/errors";
import { writeAuditLog } from "@/lib/services/audit";

/**
 * POST /api/auth/logout
 * Session beenden, Cookie loeschen.
 */
export async function POST() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.auth.signOut();

    if (user) {
      await writeAuditLog({
        tenantId: null,
        userId: user.id,
        action: "auth.logout",
        resourceType: "auth",
      });
    }

    const response = jsonResponse({ message: "Abgemeldet" });

    // Cookie loeschen
    return new Response(response.body, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        "Set-Cookie": "sb-access-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
      },
    });
  } catch (err) {
    return serverError("Logout failed", err);
  }
}
