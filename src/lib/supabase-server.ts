import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Server-Client: Fuer API Routes und Server Components.
 * Liest Access-Token aus dem Cookie `sb-access-token`.
 * Custom Fetch erzwingt den Cookie-Token (Supabase JS v2 ueberschreibt sonst den Auth-Header).
 */
export async function createServerClient() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Service-Role-Client: Umgeht RLS vollstaendig.
 * NUR fuer Backend-Operationen verwenden, die Service-Only-Tabellen betreffen
 * (tenants, tenant_members, audit_log, config_*).
 *
 * WARNUNG: Jede Query MUSS einen expliziten tenant_id-Filter enthalten.
 * Auth MUSS vor dem Aufruf geprueft sein (requireAuth).
 * Siehe STRIDE T-1, ADR-007.
 */
export function createServiceRoleClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
