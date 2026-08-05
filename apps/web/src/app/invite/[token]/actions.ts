"use server";

import { joinRoomResponseSchema } from "@yume/room-schema";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseUrl } from "@/lib/supabase/env";

export type JoinRoomState = {
  error?: string;
  pending?: boolean;
};

export async function joinRoomAction(
  token: string,
  _prevState: JoinRoomState,
  formData: FormData
): Promise<JoinRoomState> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    const guestName = String(formData.get("guestName") ?? "").trim();
    if (!guestName) {
      return { error: "Enter a name to join as a guest." };
    }

    const { error: anonError } = await supabase.auth.signInAnonymously({
      options: { data: { display_name: guestName } }
    });

    if (anonError) {
      return { error: anonError.message };
    }
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    return { error: "Could not start a session. Try again." };
  }

  const password = formData.get("password");

  const response = await fetch(`${supabaseUrl}/functions/v1/join-room`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      token,
      password: password ? String(password) : undefined
    })
  });

  const parsed = joinRoomResponseSchema.safeParse(await response.json().catch(() => ({})));

  if (!parsed.success || parsed.data.status === "error") {
    const reason = parsed.success && parsed.data.status === "error" ? parsed.data.reason : "invalid_token";
    return { error: describeJoinError(reason) };
  }

  if (parsed.data.status === "pending_approval") {
    return { pending: true };
  }

  redirect(`/room/${parsed.data.room_id}`);
}

function describeJoinError(reason: string): string {
  switch (reason) {
    case "expired":
      return "This invite link has expired.";
    case "revoked":
      return "This invite link has been revoked.";
    case "wrong_password":
      return "That password isn't right.";
    case "room_full":
      return "This room is full.";
    case "banned":
      return "You've been removed from this room.";
    case "room_locked":
      return "This room is locked and isn't accepting new members right now.";
    case "join_failed":
      return "Something went wrong joining that room. Try again.";
    case "rate_limited":
      return "Too many attempts — try again in a moment.";
    default:
      return "This invite link isn't valid.";
  }
}
