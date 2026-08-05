import { supabase } from "./supabase";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;

export type ActionResult = { error?: string };

/** create/join/ready/leave are plain RLS-permitted writes (see
 *  supabase/migrations/0013_games_rls.sql) — same as apps/web's
 *  games/actions.ts, just called straight from the mobile client. */

export async function createTicTacToeGame(roomId: string, profileId: string): Promise<{ sessionId?: string; error?: string }> {
  const { data: session, error } = await supabase
    .from("game_sessions")
    .insert({ room_id: roomId, game_type: "tic_tac_toe", created_by: profileId })
    .select("*")
    .single();
  if (error || !session) return { error: error?.message ?? "Could not create game." };

  await supabase.from("game_players").insert({ session_id: session.id, profile_id: profileId });
  return { sessionId: session.id };
}

export async function joinGame(sessionId: string, profileId: string, asSpectator: boolean): Promise<ActionResult> {
  const { data: existing } = await supabase
    .from("game_players")
    .select("id")
    .eq("session_id", sessionId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (existing) return {};

  const { error } = await supabase
    .from("game_players")
    .insert({ session_id: sessionId, profile_id: profileId, is_spectator: asSpectator });
  return error ? { error: error.message } : {};
}

export async function readyUp(sessionId: string, profileId: string, ready: boolean): Promise<ActionResult> {
  const { error } = await supabase
    .from("game_players")
    .update({ is_ready: ready })
    .eq("session_id", sessionId)
    .eq("profile_id", profileId);
  return error ? { error: error.message } : {};
}

export async function leaveGame(sessionId: string, profileId: string): Promise<ActionResult> {
  await supabase.from("game_players").delete().eq("session_id", sessionId).eq("profile_id", profileId);
  return {};
}

/** start/rematch/move all mutate game_sessions.status/state, which is
 *  service-role-only (no client update policy at all on game_sessions) —
 *  mobile has no server of its own, so these go through the
 *  supabase/functions/game-actions edge function, mirroring how
 *  apps/web's games/game-dispatch.ts uses a service-role client
 *  server-side. See that function's header comment for why it's
 *  tic-tac-toe-only. */
async function callGameActions(body: Record<string, unknown>): Promise<ActionResult & { state?: unknown }> {
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session) return { error: "Not signed in." };

  const response = await fetch(`${supabaseUrl}/functions/v1/game-actions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const responseBody = await response.json().catch(() => ({}));
  if (!response.ok) return { error: responseBody.error ?? "Something went wrong." };
  return responseBody;
}

export function startTicTacToeGame(sessionId: string) {
  return callGameActions({ action: "start", session_id: sessionId });
}

export function rematchTicTacToeGame(sessionId: string) {
  return callGameActions({ action: "rematch", session_id: sessionId });
}

export function makeTicTacToeMove(sessionId: string, cellIndex: number) {
  return callGameActions({ action: "move", session_id: sessionId, cell_index: cellIndex });
}
