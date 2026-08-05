import { z } from "zod";
import type { GameEngine, MoveResult } from "./engine";

export type Mark = "X" | "O";

export type TicTacToeState = {
  board: (Mark | null)[];
  marks: Record<string, Mark>;
  turn: string;
  winnerId: string | null;
  isDraw: boolean;
};

export const ticTacToeMoveSchema = z.object({ type: z.literal("place"), cellIndex: z.number().min(0).max(8) });
export type TicTacToeMove = z.infer<typeof ticTacToeMoveSchema>;

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

function checkWinner(board: (Mark | null)[]): Mark | null {
  for (const [a, b, c] of LINES) {
    const mark = board[a as number];
    if (mark && mark === board[b as number] && mark === board[c as number]) return mark;
  }
  return null;
}

export const ticTacToeEngine: GameEngine<TicTacToeState, TicTacToeMove> = {
  gameType: "tic_tac_toe",
  minPlayers: 2,
  maxPlayers: 2,

  createInitialState(playerIds) {
    const [first, second] = playerIds;
    return {
      board: Array<Mark | null>(9).fill(null),
      marks: { [first!]: "X", [second!]: "O" },
      turn: first!,
      winnerId: null,
      isDraw: false
    };
  },

  applyMove(state, move, playerId): MoveResult<TicTacToeState> {
    if (state.winnerId || state.isDraw) return { ok: false, error: "Game is already over." };
    if (state.turn !== playerId) return { ok: false, error: "Not your turn." };
    if (state.board[move.cellIndex] !== null) return { ok: false, error: "That cell is taken." };

    const mark = state.marks[playerId];
    if (!mark) return { ok: false, error: "You're not a player in this game." };

    const board = [...state.board];
    board[move.cellIndex] = mark;

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
};
