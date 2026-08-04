// Supabase Edge Function (Deno). Mints a short-lived LiveKit access token
// for a room member. The LiveKit API secret never reaches the client —
// see docs/phase-1/04-security-rls.md §7. Verify current livekit-server-sdk
// docs before redeploying (docs/phase-1/07-api-capability-review.md).
import { createClient } from "npm:@supabase/supabase-js@2";
import { AccessToken } from "npm:livekit-server-sdk@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const livekitUrl = Deno.env.get("LIVEKIT_URL")!;
const livekitApiKey = Deno.env.get("LIVEKIT_API_KEY")!;
const livekitApiSecret = Deno.env.get("LIVEKIT_API_SECRET")!;

const adminClient = createClient(supabaseUrl, serviceRoleKey);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type"
    }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return json({}, 200);
  }
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

  const body = await req.json().catch(() => ({}));
  const roomId = typeof body.room_id === "string" ? body.room_id : null;
  if (!roomId) {
    return json({ error: "missing_room_id" }, 400);
  }

  const { data: membership } = await adminClient
    .from("room_memberships")
    .select("role")
    .eq("room_id", roomId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!membership) {
    return json({ error: "not_a_member" }, 403);
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  // Every member (including guests) can publish and subscribe — this is a
  // small-group hangout, not a presenter/audience product, so there's no
  // role-gated publish restriction for v1 (see docs/phase-1/01-prd.md).
  const accessToken = new AccessToken(livekitApiKey, livekitApiSecret, {
    identity: user.id,
    name: profile?.display_name ?? "Friend",
    ttl: "10m"
  });
  accessToken.addGrant({
    room: roomId,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  });

  const token = await accessToken.toJwt();

  return json({ token, url: livekitUrl, identity: user.id });
});
