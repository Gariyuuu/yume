// Supabase Edge Function (Deno). Room moderation actions for a room's
// owner/moderator: mute, kick, and ban. All three run with the service
// role because they cross the Postgres/LiveKit boundary (force-disconnect
// a live participant) and/or need to write an audit_logs row that a
// plain client-side RLS write can't be trusted to write honestly — see
// docs/phase-1/04-security-rls.md §5.
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
  const action = typeof body.action === "string" ? body.action : "mute";
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : null;

  if (!roomId || !targetProfileId) {
    return json({ error: "missing_fields" }, 400);
  }
  if (targetProfileId === user.id) {
    return json({ error: "cannot_target_self" }, 400);
  }

  const [{ data: callerMembership }, { data: targetMembership }] = await Promise.all([
    adminClient.from("room_memberships").select("role").eq("room_id", roomId).eq("profile_id", user.id).maybeSingle(),
    adminClient
      .from("room_memberships")
      .select("role")
      .eq("room_id", roomId)
      .eq("profile_id", targetProfileId)
      .maybeSingle()
  ]);

  if (!callerMembership || (callerMembership.role !== "owner" && callerMembership.role !== "moderator")) {
    return json({ error: "not_authorized" }, 403);
  }

  // A moderator can act on members/guests but never on the owner or
  // another moderator — only the owner outranks a moderator.
  if (targetMembership?.role === "owner") {
    return json({ error: "cannot_target_owner" }, 403);
  }
  if (callerMembership.role === "moderator" && targetMembership?.role === "moderator") {
    return json({ error: "not_authorized" }, 403);
  }

  if (action === "mute") {
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
  }

  if (action === "kick" || action === "ban") {
    await roomService.removeParticipant(roomId, targetProfileId).catch(() => {
      // Fine if they weren't connected — kick/ban still removes room
      // access below, that's the part that has to succeed.
    });

    await adminClient.from("room_memberships").delete().eq("room_id", roomId).eq("profile_id", targetProfileId);

    if (action === "ban") {
      await adminClient.from("room_bans").insert({
        room_id: roomId,
        profile_id: targetProfileId,
        banned_by: user.id,
        reason
      });
    }

    await adminClient.from("audit_logs").insert({
      room_id: roomId,
      actor_id: user.id,
      action: action === "ban" ? "ban_participant" : "kick_participant",
      target_id: targetProfileId,
      metadata: reason ? { reason } : {}
    });

    return json({ status: action === "ban" ? "banned" : "kicked" });
  }

  return json({ error: "unknown_action" }, 400);
});
