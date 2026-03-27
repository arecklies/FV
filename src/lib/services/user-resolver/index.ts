import { SupabaseClient } from "@supabase/supabase-js";

/**
 * UserResolverService (PROJ-47 US-1)
 *
 * Löst User-IDs zu E-Mail-Adressen auf via Supabase Auth Admin API (Service-Role).
 * Batch-fähig: Dedupliziert IDs und löst parallel auf.
 */

/**
 * Löst eine Liste von User-IDs zu E-Mail-Adressen auf.
 * Verwendet Supabase Auth Admin API (getUserById) via Service-Role-Client.
 * Gibt eine Map<userId, email> zurück.
 *
 * Fallback: Fehlende oder fehlerhafte User-IDs werden nicht in die Map aufgenommen.
 */
export async function resolveUserEmails(
  serviceClient: SupabaseClient,
  userIds: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const uniqueIds = [...new Set(userIds.filter(Boolean))];

  if (uniqueIds.length === 0) return result;

  // Parallel-Auflösung über Auth Admin API (Service-Role erforderlich)
  const lookups = uniqueIds.map(async (id) => {
    try {
      const { data, error } = await serviceClient.auth.admin.getUserById(id);
      if (!error && data?.user?.email) {
        result.set(id, data.user.email);
      }
    } catch {
      // Fehlschlag wird toleriert — Fallback auf UUID-Fragment im Frontend (AC-3)
    }
  });

  await Promise.all(lookups);

  return result;
}
