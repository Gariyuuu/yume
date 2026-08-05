"use server";

import { ticTacToeEngine, type TicTacToeMove } from "@yume/game-sdk";
import { applyGameMove, rematchInternal, startGameInternal } from "./game-dispatch";

export async function startTicTacToeGameAction(sessionId: string) {
  return startGameInternal(sessionId, ticTacToeEngine);
}

export async function rematchTicTacToeGameAction(sessionId: string) {
  return rematchInternal(sessionId, ticTacToeEngine);
}

export async function makeTicTacToeMoveAction(sessionId: string, cellIndex: number) {
  const move: TicTacToeMove = { type: "place", cellIndex };
  return applyGameMove(sessionId, ticTacToeEngine, move);
}
