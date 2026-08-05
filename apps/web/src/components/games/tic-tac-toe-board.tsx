"use client";

import type { GamePlayer, TicTacToeState } from "@yume/game-sdk";
import { useTransition } from "react";
import { makeTicTacToeMoveAction } from "@/app/room/[roomId]/games/tic-tac-toe-actions";
import { cn } from "@/lib/utils";

export function TicTacToeBoard({
  sessionId,
  state,
  players,
  currentProfileId,
  displayNames
}: {
  sessionId: string;
  state: TicTacToeState;
  players: GamePlayer[];
  currentProfileId: string;
  displayNames: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();
  const myTurn = state.turn === currentProfileId && !state.winnerId && !state.isDraw;
  const isPlayer = players.some((p) => p.profile_id === currentProfileId && !p.is_spectator);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm">
        {state.winnerId
          ? `${displayNames[state.winnerId] ?? "Someone"} wins!`
          : state.isDraw
            ? "It's a draw."
            : myTurn
              ? "Your turn"
              : `${displayNames[state.turn] ?? "Opponent"}'s turn`}
      </p>

      <div className="grid grid-cols-3 gap-1.5">
        {state.board.map((cell, index) => (
          <button
            key={index}
            type="button"
            disabled={pending || !isPlayer || !myTurn || cell !== null}
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-md border bg-card text-2xl font-semibold",
              cell === "X" ? "text-brand-600" : "text-rose-500"
            )}
            onClick={() => startTransition(() => makeTicTacToeMoveAction(sessionId, index).then(() => {}))}
          >
            {cell}
          </button>
        ))}
      </div>
    </div>
  );
}
