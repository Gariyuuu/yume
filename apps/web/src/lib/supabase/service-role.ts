import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@yume/supabase-types";
import { supabaseUrl } from "./env";

/**
 * First use of the service role directly inside the Next.js app (every
 * prior phase kept service-role operations in Supabase Edge Functions —
 * see docs/phase-1/04-security-rls.md §5/§7). Used only for game move
 * validation (supabase/migrations/0013_games_rls.sql explains why: RLS
 * can't express per-game move legality, so game_sessions/game_players
 * writes beyond ready/connected have no client policy at all — only this
 * client can make them, and only after this module's callers have
 * validated the move server-side first). Never import this into a Client
 * Component or anything that runs in the browser.
 */
export function createServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Set it in apps/web/.env.local from your Supabase project's API settings (service_role secret, never NEXT_PUBLIC_)."
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
