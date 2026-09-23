import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client — for Server Components / Route Handlers ONLY.
 *
 * Uses the service-role key (never expose it to the browser) so paginated
 * reads work regardless of Row Level Security policies. Falls back to the
 * anon key when no service-role key is configured.
 *
 * Returns `null` when Supabase isn't configured so pages can render a
 * helpful setup message instead of crashing (e.g. local dev without env).
 *
 * Required env:  SUPABASE_URL
 * Key (one of):  SUPABASE_SERVICE_ROLE_KEY | SUPABASE_ANON_KEY |
 *                NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
let cachedClient: SupabaseClient | null = null;

export function createServerSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}
