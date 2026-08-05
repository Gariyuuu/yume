import { z } from "zod";
import type { GameEngine, MoveResult } from "./engine";

export type TriviaQuestionPublic = {
  id: string;
  text: string;
  category: string;
  choices: string[];
};

export type TriviaState = {
  roundIndex: number;
  totalRounds: number;
  phase: "waiting" | "question" | "reveal" | "finished";
  question: TriviaQuestionPublic | null;
  correctIndex: number | null;
  answers: Record<string, number>;
  usedQuestionIds: string[];
};

/**
 * `start_round` and `reveal` carry data the *caller* (the Server Action,
 * which has the server-only question bank — see
 * apps/web/src/app/room/[roomId]/games/trivia-questions.ts) already
 * computed. This engine never sees the correct answer key; it only ever
 * receives "here's the public question" or "here's the already-decided
 * correct index and score deltas," which keeps this package safe to
 * bundle into the client for rendering without leaking answers.
 */
export const triviaMoveSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("start_round"),
    question: z.object({
      id: z.string(),
      text: z.string(),
      category: z.string(),
      choices: z.array(z.string())
    })
  }),
  z.object({ type: z.literal("answer"), choiceIndex: z.number() }),
  z.object({
    type: z.literal("reveal"),
    correctIndex: z.number(),
    scoreDeltas: z.record(z.number())
  })
]);
export type TriviaMove = z.infer<typeof triviaMoveSchema>;

export const TRIVIA_TOTAL_ROUNDS = 5;

export const triviaEngine: GameEngine<TriviaState, TriviaMove> = {
  gameType: "trivia",
  minPlayers: 2,
  maxPlayers: 12,

  createInitialState(): TriviaState {
    return {
      roundIndex: -1,
      totalRounds: TRIVIA_TOTAL_ROUNDS,
      phase: "waiting",
      question: null,
      correctIndex: null,
      answers: {},
      usedQuestionIds: []
    };
  },

  applyMove(state, move, playerId): MoveResult<TriviaState> {
    if (move.type === "start_round") {
      if (state.phase === "question") return { ok: false, error: "A round is already active." };
      return {
        ok: true,
        state: {
          ...state,
          roundIndex: state.roundIndex + 1,
          phase: "question",
          question: move.question,
          correctIndex: null,
          answers: {},
          usedQuestionIds: [...state.usedQuestionIds, move.question.id]
        }
      };
    }

    if (move.type === "answer") {
      if (state.phase !== "question") return { ok: false, error: "No active question." };
      if (playerId in state.answers) return { ok: false, error: "You already answered." };
      return { ok: true, state: { ...state, answers: { ...state.answers, [playerId]: move.choiceIndex } } };
    }

    if (move.type === "reveal") {
      if (state.phase !== "question") return { ok: false, error: "Nothing to reveal." };
      const finished = state.roundIndex + 1 >= state.totalRounds;
      return {
        ok: true,
        finished,
        scoreDeltas: move.scoreDeltas,
        state: {
          ...state,
          phase: finished ? "finished" : "reveal",
          correctIndex: move.correctIndex
        }
      };
    }

    return { ok: false, error: "Unknown move." };
  }
};
