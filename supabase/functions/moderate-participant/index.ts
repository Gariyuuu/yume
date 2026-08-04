// Supabase Edge Function (Deno). Host-mute for a room's owner/moderator —
// force-mutes another participant's microphone via LiveKit's server API.
// This is deliberately narrow (mute only): kick/ban belong to the safety
// system in Phase 7 (docs/phase-1/11-implementation-checklist.md), not
// bundled in here.
import { createClient } from "npm:@supabase/supabase-js@2";
import { RoomServiceClient, trackSourceToString } from "npm:livekit-server-sdk@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const livekitHost = Deno.env.get("LIVEKIT_URL")!;
const livekitApiKey = Deno.env.get("LIVEKIT_API_KEY")!;
const livekitApiSecret = Deno.env.get("LIVEKIT_API_SECRET")!;

const adminClient = createClient(supabaseUrl, serviceRoleKey);
const roomService = new RoomServiceClient(livekitHost, livekitApiKey, livekitApiSecret);

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
  if (req.method === "OPTIONS") return json({}, 200);
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "not_authenticated" }, 401);

  const jwt = authHeader.replace("Bearer ", "");
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const {
    data: { user },
    error: userError
  } = await callerClient.auth.getUser(jwt);

  if (userError || !user) return json({ error: "not_authenticated" }, 401);

  const body = await req.json().catch(() => ({}));
  const roomId = typeof body.room_id === "string" ? body.room_id : null;
  const targetProfileId = typeof body.target_profile_id === "string" ? body.target_profile_id : null;

  if (!roomId || !targetProfileId) {
    return json({ error: "missing_fields" }, 400);
  }

  const { data: callerMembership } = await adminClient
    .from("room_memberships")
    .select("role")
    .eq("room_id", roomId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!callerMembership || (callerMembership.role !== "owner" && callerMembership.role !== "moderator")) {
    return json({ error: "not_authorized" }, 403);
  }

  const participants = await roomService.listParticipants(roomId);
  const target = participants.find((participant) => participant.identity === targetProfileId);
  const micTrack = target?.tracks.find((track) => trackSourceToString(track.source) === "microphone");

  if (!target || !micTrack) {
    return json({ error: "not_connected" }, 404);
  }

  await roomService.mutePublishedTrack(roomId, targetProfileId, micTrack.sid, true);

  await adminClient.from("audit_logs").insert({
    room_id: roomId,
    actor_id: user.id,
    action: "mute_participant",
    target_id: targetProfileId
  });

  return json({ status: "muted" });
});
