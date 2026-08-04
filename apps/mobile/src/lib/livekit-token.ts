import { supabase } from "./supabase";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;

export type LiveKitTokenResult =
  | { status: "ok"; token: string; url: string }
  | { status: "error"; error: string };

/** Mirrors apps/web/src/app/room/[roomId]/livekit-actions.ts — mobile has
 *  no server-action equivalent, so this calls the Edge Function directly
 *  from the client with the session's access token. */
export async function fetchLiveKitToken(roomId: string): Promise<LiveKitTokenResult> {
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
  return { status: "ok", token: body.token, url: body.url };
}
