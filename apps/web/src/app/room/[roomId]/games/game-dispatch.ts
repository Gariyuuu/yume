import "server-only";

import type { GameEngine } from "@yume/game-sdk";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type ActionResult = { error?: string };

/**
 * Everything in this file takes a `GameEngine` argument, which has
 * function properties (createInitialState/applyMove) — that can't cross
 * the Server Action serialization boundary, so none of these can be
 * `"use server"` exports called directly from a Client Component. Each
 * per-game actions file (tic-tac-toe-actions.ts etc.) wraps these with a
 * `"use server"` function that takes only serializable arguments and
 * calls the matching helper here with its own engine, server-to-server.
 */

/** Any non-spectator player can start once everyone (min 2) is ready —
 *  status/initial state are service-role writes, same reasoning as
 *  every other game_sessions mutation (0013_games_rls.sql). */
export async function startGameInternal<TState>(
  sessionId: string,
  engine: GameEngine<TState, unknown>
): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: players } = await supabase
    .from("game_players")
    .select("*")
    .eq("session_id", sessionId)
    .eq("is_spectator", false)
    .order("joined_at");

  const active = players ?? [];
  if (!active.some((p) => p.profile_id === profile.id)) return { error: "Join the game first." };
  if (active.length < engine.minPlayers) return { error: `Needs at least ${engine.minPlayers} players.` };
  if (active.length > engine.maxPlayers) return { error: `Too many players (max ${engine.maxPlayers}).` };
  if (!active.every((p) => p.is_ready)) return { error: "Not everyone is ready yet." };

  const service = createServiceRoleClient();
  const playerIds = active.map((p) => p.profile_id);
  const { error } = await service
    .from("game_sessions")
    .update({
      status: "in_progress",
      state: engine.createInitialState(playerIds) as never,
      updated_at: new Date().toISOString()
    })
    .eq("id", sessionId);

  return error ? { error: error.message } : {};
}

export async function rematchInternal<TState>(
  sessionId: string,
  engine: GameEngine<TState, unknown>
): Promise<ActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const service = createServiceRoleClient();

  const { data: players } = await supabase
    .from("game_players")
    .select("*")
    .eq("session_id", sessionId)
    .eq("is_spectator", false)
    .order("joined_at");

  const playerIds = (players ?? []).map((p) => p.profile_id);

  await service.from("game_players").update({ score: 0, is_ready: false }).eq("session_id", sessionId);
  const { error } = await service
    .from("game_sessions")
    .update({
      status: "waiting",
      state: engine.createInitialState(playerIds) as never,
      updated_at: new Date().toISOString()
    })
    .eq("id", sessionId);

  return error ? { error: error.message } : {};
}

/** Trusted read of the current state — used by game-specific action
 *  wrappers (trivia/draw-and-guess) that need to look something up
 *  (the question bank, the secret word) before deciding what move to
 *  dispatch through applyGameMove below. */
export async function getGameState<TState>(sessionId: string): Promise<TState | null> {
  const service = createServiceRoleClient();
  const { data } = await service.from("game_sessions").select("state").eq("id", sessionId).single();
  return (data?.state as TState) ?? null;
}

/**
 * The single choke point every game move goes through — see
 * packages/game-sdk/src/engine.ts's header comment. Reads the
 * authoritative state with the service-role client (never trusts a
 * client-supplied "current state"), runs the pure engine function, and
 * only persists the result if the engine accepted the move.
 */
export async function applyGameMove<TState, TMove>(
  sessionId: string,
  engine: GameEngine<TState, TMove>,
  move: TMove
): Promise<ActionResult & { state?: TState }> {
  const profile = await requireProfile();
  const service = createServiceRoleClient();

  const [{ data: session }, { data: players }] = await Promise.all([
    service.from("game_sessions").select("*").eq("id", sessionId).single(),
    service.from("game_players").select("*").eq("session_id", sessionId).eq("is_spectator", false).order("joined_at")
  ]);

  if (!session) return { error: "Game not found." };
  if (session.status !== "in_progress") return { error: "Game isn't active." };

  const playerIds = (players ?? []).map((p) => p.profile_id);
  if (!playerIds.includes(profile.id)) return { error: "You're not a player in this game." };

  const result = engine.applyMove(session.state as TState, move, profile.id, playerIds);
  if (!result.ok || !result.state) return { error: result.error ?? "Invalid move." };

  await service
    .from("game_sessions")
    .update({
      state: result.state as never,
      status: result.finished ? "finished" : session.status,
      updated_at: new Date().toISOString()
    })
    .eq("id", sessionId);

  if (result.scoreDeltas) {
    await Promise.all(
      Object.entries(result.scoreDeltas).map(([playerId, delta]) =>
        service.rpc("increment_game_score", { p_session_id: sessionId, p_profile_id: playerId, p_delta: delta })
      )
    );
  }

  await service.from("game_events").insert({
    session_id: sessionId,
    profile_id: profile.id,
    event_type: typeof move === "object" && move && "type" in move ? String((move as { type: unknown }).type) : "move",
    payload: move as never
  });

  return { state: result.state };
}
