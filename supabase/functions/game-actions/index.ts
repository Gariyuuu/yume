// Supabase Edge Function (Deno). Mobile has no Next.js server, so it has
// no equivalent of apps/web's game-dispatch.ts Server Actions — this
// function is that equivalent for mobile, reachable over plain HTTP.
//
// Scope: tic-tac-toe only. Trivia and Draw & Guess keep secret content
// (question bank / word list) that would have to be duplicated into this
// Deno runtime to validate moves here, and Draw & Guess also needs a
// canvas layer mobile doesn't have yet (see apps/mobile/AGENTS.md-style
// "thinner, documented" pattern used everywhere else in this repo).
// create/join/ready/leave don't need this function at all — those are
// plain RLS-permitted writes the mobile client makes directly against
// game_sessions/game_players with its own session, same as web's
// actions.ts. Only status/state transitions (start/move/rematch) are
// service-role-only per supabase/migrations/0013_games_rls.sql, which is
// why they need a trusted server to run through.
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

type Mark = "X" | "O";
type TicTacToeState = {
  board: (Mark | null)[];
  marks: Record<string, Mark>;
  turn: string;
  winnerId: string | null;
  isDraw: boolean;
};

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

// Mirrors packages/game-sdk/src/tic-tac-toe.ts exactly. Kept as a
// duplicate rather than an import: Deno edge functions here are
// self-contained (npm: specifiers only, no monorepo-relative imports —
// see supabase/functions/mint-livekit-token/index.ts for the established
// pattern), and this is small enough that duplicating it is safer than
// wiring up a shared bundle for one 30-line function.
function createInitialState(playerIds: string[]): TicTacToeState {
  const [first, second] = playerIds;
  return {
    board: Array<Mark | null>(9).fill(null),
    marks: { [first!]: "X", [second!]: "O" },
    turn: first!,
    winnerId: null,
    isDraw: false
  };
}

function checkWinner(board: (Mark | null)[]): Mark | null {
  for (const [a, b, c] of LINES) {
    const mark = board[a!];
    if (mark && mark === board[b!] && mark === board[c!]) return mark;
  }
  return null;
}

function applyMove(
  state: TicTacToeState,
  cellIndex: number,
  playerId: string
): { ok: boolean; error?: string; state?: TicTacToeState; finished?: boolean; scoreDeltas?: Record<string, number> } {
  if (state.winnerId || state.isDraw) return { ok: false, error: "Game is already over." };
  if (state.turn !== playerId) return { ok: false, error: "Not your turn." };
  if (typeof cellIndex !== "number" || cellIndex < 0 || cellIndex > 8) return { ok: false, error: "Invalid cell." };
  if (state.board[cellIndex] !== null) return { ok: false, error: "That cell is taken." };

  const mark = state.marks[playerId];
  if (!mark) return { ok: false, error: "You're not a player in this game." };

  const board = [...state.board];
  board[cellIndex] = mark;

  const winnerMark = checkWinner(board);
  const winnerId = winnerMark ? Object.keys(state.marks).find((id) => state.marks[id] === winnerMark) ?? null : null;
  const isDraw = !winnerId && board.every((cell) => cell !== null);
  const otherPlayerId = Object.keys(state.marks).find((id) => id !== playerId)!;

  const nextState: TicTacToeState = {
    ...state,
    board,
    turn: winnerId || isDraw ? state.turn : otherPlayerId,
    winnerId,
    isDraw
  };

  return {
    ok: true,
    state: nextState,
    finished: Boolean(winnerId || isDraw),
    scoreDeltas: winnerId ? { [winnerId]: 1 } : undefined
  };
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
  const action = body.action;
  const sessionId = typeof body.session_id === "string" ? body.session_id : null;
  if (!sessionId) return json({ error: "missing_session_id" }, 400);

  const { data: session } = await adminClient.from("game_sessions").select("*").eq("id", sessionId).single();
  if (!session) return json({ error: "not_found" }, 404);
  if (session.game_type !== "tic_tac_toe") {
    return json({ error: "unsupported_on_mobile" }, 400);
  }

  const { data: players } = await adminClient
    .from("game_players")
    .select("*")
    .eq("session_id", sessionId)
    .eq("is_spectator", false)
    .order("joined_at");
  const active = players ?? [];
  const playerIds = active.map((p) => p.profile_id);

  if (action === "start") {
    if (!playerIds.includes(user.id)) return json({ error: "Join the game first." }, 400);
    if (active.length !== 2) return json({ error: "Needs exactly 2 players." }, 400);
    if (!active.every((p) => p.is_ready)) return json({ error: "Not everyone is ready yet." }, 400);

    const { error } = await adminClient
      .from("game_sessions")
      .update({ status: "in_progress", state: createInitialState(playerIds), updated_at: new Date().toISOString() })
      .eq("id", sessionId);
    return error ? json({ error: error.message }, 400) : json({});
  }

  if (action === "rematch") {
    await adminClient.from("game_players").update({ score: 0, is_ready: false }).eq("session_id", sessionId);
    const { error } = await adminClient
      .from("game_sessions")
      .update({ status: "waiting", state: createInitialState(playerIds), updated_at: new Date().toISOString() })
      .eq("id", sessionId);
    return error ? json({ error: error.message }, 400) : json({});
  }

  if (action === "move") {
    if (session.status !== "in_progress") return json({ error: "Game isn't active." }, 400);
    if (!playerIds.includes(user.id)) return json({ error: "You're not a player in this game." }, 400);

    const cellIndex = body.cell_index;
    const result = applyMove(session.state as TicTacToeState, cellIndex, user.id);
    if (!result.ok || !result.state) return json({ error: result.error ?? "Invalid move." }, 400);

    await adminClient
      .from("game_sessions")
      .update({
        state: result.state,
        status: result.finished ? "finished" : session.status,
        updated_at: new Date().toISOString()
      })
      .eq("id", sessionId);

    if (result.scoreDeltas) {
      await Promise.all(
        Object.entries(result.scoreDeltas).map(([profileId, delta]) =>
          adminClient.rpc("increment_game_score", { p_session_id: sessionId, p_profile_id: profileId, p_delta: delta })
        )
      );
    }

    await adminClient.from("game_events").insert({
      session_id: sessionId,
      profile_id: user.id,
      event_type: "move",
      payload: { type: "place", cellIndex }
    });

    return json({ state: result.state });
  }

  return json({ error: "unknown_action" }, 400);
});
