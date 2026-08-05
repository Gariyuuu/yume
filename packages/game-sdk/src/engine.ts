import type { GameType } from "./types";

/**
 * The contract every game implements — see docs/phase-1/11-implementation-checklist.md
 * ("modular game SDK so future games can be added without rewriting the
 * main application"). A game engine is pure game-rules logic: given the
 * current state and a move from a specific player, produce the next
 * state or reject the move. It never touches the database directly —
 * that's the generic move-dispatch Server Action's job (see
 * apps/web/src/app/room/[roomId]/games/actions.ts), which is what makes
 * "no client-trusted win conditions" hold for every game uniformly
 * rather than each game reimplementing its own trust boundary.
 *
 * Content (trivia questions, draw-and-guess words) deliberately isn't
 * part of this package: anything bundled here ships in the client
 * JavaScript bundle too, which would leak answers. Content stays in
 * server-only modules in the Next.js app and gets passed into the engine
 * as a parameter — see games/trivia-questions.ts and
 * games/draw-and-guess-words.ts.
 */
export interface MoveResult<TState> {
  ok: boolean;
  error?: string;
  state?: TState;
  /** profileId -> score delta to add (not set, added) to game_players.score. */
  scoreDeltas?: Record<string, number>;
  finished?: boolean;
}

export interface GameEngine<TState, TMove> {
  gameType: GameType;
  minPlayers: number;
  maxPlayers: number;
  createInitialState(playerIds: string[]): TState;
  /** `playerIds` is every non-spectator player, in join order — engines
   *  that need turn order (tic-tac-toe) derive it from this rather than
   *  storing it themselves. */
  applyMove(state: TState, move: TMove, playerId: string, playerIds: string[]): MoveResult<TState>;
}
