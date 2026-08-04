import { createServerClient } from "@supabase/ssr";
import type { Database } from "@yume/supabase-types";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Supabase client for use in Server Components, Server Actions, and Route
 * Handlers. Reads the caller's session from cookies, so all queries run
 * under RLS as that user (never the service role).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render, where cookies can't be
          // written. Session refresh for that request is handled by
          // src/proxy.ts instead — safe to ignore here.
        }
      }
    }
  });
}
