import { supabase } from "./supabase";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;

export type ActionResult = { error?: string };

/** Mirrors apps/web/src/app/room/[roomId]/livekit-actions.ts's
 *  mute/kick/ban actions — same moderate-participant Edge Function, just
 *  called straight from the mobile client instead of through a Next.js
 *  Server Action (mobile has no server of its own). */
async function callModerateParticipant(body: Record<string, unknown>): Promise<ActionResult> {
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session) return { error: "Not signed in." };

  const response = await fetch(`${supabaseUrl}/functions/v1/moderate-participant`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const responseBody = await response.json().catch(() => ({}));
    return { error: responseBody.error ?? "That didn't work." };
  }
  return {};
}

export function muteParticipant(roomId: string, targetProfileId: string) {
  return callModerateParticipant({ room_id: roomId, target_profile_id: targetProfileId, action: "mute" });
}

export function kickParticipant(roomId: string, targetProfileId: string) {
  return callModerateParticipant({ room_id: roomId, target_profile_id: targetProfileId, action: "kick" });
}

export function banParticipant(roomId: string, targetProfileId: string) {
  return callModerateParticipant({ room_id: roomId, target_profile_id: targetProfileId, action: "ban" });
}

/** report/block are plain RLS-permitted inserts (see
 *  supabase/migrations/0016_moderation_rls.sql) — same as web's
 *  moderation-actions.ts. */
export async function reportUser(
  roomId: string,
  reportedBy: string,
  targetProfileId: string,
  reason: string
): Promise<ActionResult> {
  const { error } = await supabase.from("reports").insert({
    room_id: roomId,
    reported_by: reportedBy,
    reported_profile_id: targetProfileId,
    reason
  });
  if (error?.message.includes("rate_limited")) return { error: "Too many reports — try again later." };
  return error ? { error: error.message } : {};
}

export async function blockUser(blockerId: string, blockedId: string): Promise<ActionResult> {
  const { error } = await supabase.from("user_blocks").insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error && error.code !== "23505") return { error: error.message };
  return {};
}
