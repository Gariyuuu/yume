// Supabase Edge Function (Deno). Deleting an auth.users row requires the
// admin API (service role) — see docs/phase-1/04-security-rls.md §9. The
// caller's JWT is re-verified here rather than trusted from the client,
// so this can only ever delete the account making the request.
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

const adminClient = createClient(supabaseUrl, serviceRoleKey);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "not_authenticated" }, 401);
  }

  const jwt = authHeader.replace("Bearer ", "");
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const {
    data: { user },
    error: userError
  } = await callerClient.auth.getUser(jwt);

  if (userError || !user) {
    return json({ error: "not_authenticated" }, 401);
  }

  // profiles row cascades (on delete cascade) to room_memberships and
  // related owned rows per supabase/migrations/0001_init.sql; deleting the
  // auth.users row first triggers that cascade via the profiles FK.
  const { error } = await adminClient.auth.admin.deleteUser(user.id);

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ status: "deleted" });
});
