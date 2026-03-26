import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";

/**
 * GET /api/auth/session
 * Aktuelle Session und Rolle abrufen.
 * Gibt 401 zurueck wenn nicht authentifiziert.
 */
export async function GET() {
  const authResult = await requireAuth();
  if (!isAuthContext(authResult)) return authResult;

  return jsonResponse({
    user: {
      id: authResult.userId,
      email: authResult.email,
      tenantId: authResult.tenantId,
      role: authResult.role,
    },
  });
}
