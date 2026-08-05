// Supabase Edge Function (Deno). Verify current Supabase Edge Functions
// docs before redeploying — import style (`npm:` specifiers) and
// `Deno.serve` usage below reflect the documented approach as of this
// plan's writing (docs/phase-1/07-api-capability-review.md).
//
// This is the ONLY place invite tokens are validated (see
// docs/phase-1/04-security-rls.md §3) and the only place a guest/member's
// own room_memberships row gets created (see §2 there, and
// supabase/migrations/0003_room_creation.sql for the equivalent
// owner-membership trigger). Runs with the service role, so every check
// here is load-bearing — nothing is re-validated by RLS afterward.
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyInvitePassword } from "./invite-password.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

const adminClient = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  if (req.method === "GET") {
    return handlePreview(url.searchParams.get("token"));
  }

  if (req.method === "POST") {
    return handleJoin(req);
  }

  return json({ status: "error", reason: "method_not_allowed" }, 405);
});

async function loadInvite(token: string | null) {
  if (!token) return { invite: null as null, room: null as null };

  const { data: invite } = await adminClient
    .from("room_invites")
    .select("*, rooms(id, name, capacity)")
    .eq("token", token)
    .maybeSingle();

  return { invite, room: invite?.rooms ?? null };
}

function inviteError(invite: { expires_at: string | null; revoked_at: string | null; max_uses: number | null; use_count: number }) {
  if (invite.revoked_at) return "revoked" as const;
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return "expired" as const;
  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) return "room_full" as const;
  return null;
}

/** GET /join-room?token=... — lets the invite landing page show the room
 *  name and whether a password/approval is required, without joining. */
async function handlePreview(token: string | null) {
  const { invite, room } = await loadInvite(token);

  if (!invite || !room) {
    return json({ status: "error", reason: "invalid_token" }, 404);
  }

  const error = inviteError(invite);
  if (error) {
    return json({ status: "error", reason: error }, 410);
  }

  return json({
    status: "ok",
    room_name: room.name,
    requires_password: Boolean(invite.password_hash),
    requires_owner_approval: invite.requires_owner_approval
  });
}

async function handleJoin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ status: "error", reason: "invalid_token" }, 401);
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
    return json({ status: "error", reason: "invalid_token" }, 401);
  }

  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : null;
  const password = typeof body.password === "string" ? body.password : undefined;

  const { data: allowed } = await adminClient.rpc("check_rate_limit", {
    p_key: `join:${user.id}`,
    p_limit: 20,
    p_window_seconds: 600
  });
  if (allowed === false) {
    return json({ status: "error", reason: "rate_limited" }, 429);
  }

  const { invite, room } = await loadInvite(token);
  if (!invite || !room) {
    return json({ status: "error", reason: "invalid_token" }, 404);
  }

  const baseError = inviteError(invite);
  if (baseError) {
    return json({ status: "error", reason: baseError }, 410);
  }

  if (invite.password_hash) {
    if (!password || !verifyInvitePassword(password, invite.password_hash)) {
      return json({ status: "error", reason: "wrong_password" }, 401);
    }
  }

  const { count: banCount } = await adminClient
    .from("room_bans")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id)
    .eq("profile_id", user.id);

  if (banCount && banCount > 0) {
    return json({ status: "error", reason: "banned" }, 403);
  }

  const { data: existingMembership } = await adminClient
    .from("room_memberships")
    .select("id")
    .eq("room_id", room.id)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existingMembership) {
    return json({ status: "joined", room_id: room.id });
  }

  const { data: fullRoom } = await adminClient.from("rooms").select("is_locked").eq("id", room.id).single();
  if (fullRoom?.is_locked) {
    return json({ status: "error", reason: "room_locked" }, 403);
  }

  const { count: memberCount } = await adminClient
    .from("room_memberships")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id);

  if (memberCount !== null && memberCount >= room.capacity) {
    return json({ status: "error", reason: "room_full" }, 409);
  }

  // NOTE: owner-approval is not fully built yet — there is no
  // notification/approval UI for the room owner in this phase, so a
  // room requiring approval currently leaves guests stuck at
  // "pending_approval" with no way to actually get approved. Tracked as
  // a known gap for Phase 5/7 rather than silently faked. See the final
  // Phase 2 report.
  if (invite.requires_owner_approval) {
    return json({ status: "pending_approval", room_id: room.id });
  }

  const { error: membershipError } = await adminClient.from("room_memberships").insert({
    room_id: room.id,
    profile_id: user.id,
    role: user.is_anonymous ? "guest" : "member"
  });

  if (membershipError) {
    return json({ status: "error", reason: "invalid_token" }, 500);
  }

  await adminClient
    .from("room_invites")
    .update({ use_count: invite.use_count + 1 })
    .eq("id", invite.id);

  return json({ status: "joined", room_id: room.id });
}
