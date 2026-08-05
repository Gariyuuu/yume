"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseUrl } from "@/lib/supabase/env";

export type LiveKitTokenState =
  | { status: "ok"; token: string; url: string; identity: string }
  | { status: "error"; error: string };

/**
 * Mints a short-lived LiveKit token for the current room by calling the
 * mint-livekit-token Edge Function server-to-server — the LiveKit API
 * secret never reaches the browser. See
 * docs/phase-1/04-security-rls.md §7.
 */
export async function getLiveKitTokenAction(roomId: string): Promise<LiveKitTokenState> {
  const supabase = await createClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    return { status: "error", error: "Not signed in." };
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/mint-livekit-token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ room_id: roomId })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { status: "error", error: body.error ?? "Could not connect to the call." };
  }

  const body = await response.json();
  return { status: "ok", token: body.token, url: body.url, identity: body.identity };
}

export type MuteParticipantState = { error?: string };

async function callModerateParticipant(body: Record<string, unknown>): Promise<MuteParticipantState> {
  const supabase = await createClient();
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

export async function muteParticipantAction(roomId: string, targetProfileId: string): Promise<MuteParticipantState> {
  return callModerateParticipant({ room_id: roomId, target_profile_id: targetProfileId, action: "mute" });
}

export async function kickParticipantAction(roomId: string, targetProfileId: string): Promise<MuteParticipantState> {
  return callModerateParticipant({ room_id: roomId, target_profile_id: targetProfileId, action: "kick" });
}

export async function banParticipantAction(
  roomId: string,
  targetProfileId: string,
  reason?: string
): Promise<MuteParticipantState> {
  return callModerateParticipant({ room_id: roomId, target_profile_id: targetProfileId, action: "ban", reason });
}
