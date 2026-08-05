import { z } from "zod";
import type { GameEngine, MoveResult } from "./engine";

export type Guess = { profileId: string; guess: string; correct: boolean; guessedAt: string };

export type DrawAndGuessState = {
  roundIndex: number;
  totalRounds: number;
  phase: "waiting" | "drawing" | "reveal" | "finished";
  drawerOrder: string[];
  drawerId: string | null;
  wordLength: number | null;
  category: string | null;
  guesses: Guess[];
  revealedWord: string | null;
};

/**
 * The word itself never appears here — see
 * supabase/migrations/0014_game_round_secrets.sql for why (only the
 * drawer may know it, and Postgres RLS can't hide one field from some
 * readers of a row that other readers can see). `start_round` and
 * `guess` carry only what the Server Action has already made safe to
 * share: word length/category, and a precomputed correctness boolean.
 */
export const drawAndGuessMoveSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start_round"), wordLength: z.number(), category: z.string() }),
  z.object({ type: z.literal("guess"), guess: z.string(), isCorrect: z.boolean() }),
  z.object({ type: z.literal("reveal"), word: z.string() })
]);
export type DrawAndGuessMove = z.infer<typeof drawAndGuessMoveSchema>;

export const DRAW_AND_GUESS_TOTAL_ROUNDS = 6;

export const drawAndGuessEngine: GameEngine<DrawAndGuessState, DrawAndGuessMove> = {
  gameType: "draw_and_guess",
  minPlayers: 2,
  maxPlayers: 10,

  createInitialState(playerIds): DrawAndGuessState {
    return {
      roundIndex: -1,
      totalRounds: Math.max(playerIds.length, DRAW_AND_GUESS_TOTAL_ROUNDS),
      phase: "waiting",
      drawerOrder: playerIds,
      drawerId: null,
      wordLength: null,
      category: null,
      guesses: [],
      revealedWord: null
    };
  },

  applyMove(state, move, playerId): MoveResult<DrawAndGuessState> {
    if (move.type === "start_round") {
      if (state.phase === "drawing") return { ok: false, error: "A round is already active." };
      const nextRoundIndex = state.roundIndex + 1;
      const expectedDrawer = state.drawerOrder[nextRoundIndex % state.drawerOrder.length];
      if (playerId !== expectedDrawer) return { ok: false, error: "It's not your turn to draw." };

      return {
        ok: true,
        state: {
          ...state,
          roundIndex: nextRoundIndex,
          phase: "drawing",
          drawerId: expectedDrawer!,
          wordLength: move.wordLength,
          category: move.category,
          guesses: [],
          revealedWord: null
        }
      };
    }

    if (move.type === "guess") {
      if (state.phase !== "drawing") return { ok: false, error: "No active round." };
      if (playerId === state.drawerId) return { ok: false, error: "The drawer can't guess." };
      if (state.guesses.some((g) => g.profileId === playerId && g.correct)) {
        return { ok: false, error: "You already guessed correctly." };
      }

      const guess: Guess = { profileId: playerId, guess: move.guess, correct: move.isCorrect, guessedAt: new Date().toISOString() };
      const nextState = { ...state, guesses: [...state.guesses, guess] };

      if (!move.isCorrect) return { ok: true, state: nextState };

      return {
        ok: true,
        state: nextState,
        scoreDeltas: { [playerId]: 2, [state.drawerId!]: 1 }
      };
    }

    if (move.type === "reveal") {
      if (state.phase !== "drawing") return { ok: false, error: "Nothing to reveal." };
      const finished = state.roundIndex + 1 >= state.totalRounds;
      return {
        ok: true,
        finished,
        state: { ...state, phase: finished ? "finished" : "reveal", revealedWord: move.word }
      };
    }

    return { ok: false, error: "Unknown move." };
  }
};
