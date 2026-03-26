import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser-Client: Fuer Client Components.
 * Nutzt den Anon-Key, RLS greift basierend auf dem JWT.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
