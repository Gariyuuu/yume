"use client";

import { useTransition } from "react";
import { deleteGameAction } from "@/app/room/[roomId]/games/actions";
import {
  rematchDrawAndGuessGameAction,
  startDrawAndGuessGameAction
} from "@/app/room/[roomId]/games/draw-and-guess-actions";
import { rematchTicTacToeGameAction, startTicTacToeGameAction } from "@/app/room/[roomId]/games/tic-tac-toe-actions";
import { rematchTriviaGameAction, startTriviaGameAction } from "@/app/room/[roomId]/games/trivia-actions";
import { Button } from "@/components/ui/button";
import { DrawAndGuessBoard } from "./draw-and-guess-board";
import { GameLobby } from "./game-lobby";
import { TicTacToeBoard } from "./tic-tac-toe-board";
import { TriviaBoard } from "./trivia-board";
import { useGameSession } from "./use-game-session";

const GAME_LABELS: Record<string, string> = {
  tic_tac_toe: "Tic-Tac-Toe",
  trivia: "Trivia",
  draw_and_guess: "Draw & Guess"
};

const START_ACTIONS: Record<string, (sessionId: string) => Promise<{ error?: string }>> = {
  tic_tac_toe: startTicTacToeGameAction,
  trivia: startTriviaGameAction,
  draw_and_guess: startDrawAndGuessGameAction
};

const REMATCH_ACTIONS: Record<string, (sessionId: string) => Promise<{ error?: string }>> = {
  tic_tac_toe: rematchTicTacToeGameAction,
  trivia: rematchTriviaGameAction,
  draw_and_guess: rematchDrawAndGuessGameAction
};

export function GameSessionView({
  sessionId,
  roomId,
  currentProfileId,
  displayNames,
  canManageAll,
  onClose
}: {
  sessionId: string;
  roomId: string;
  currentProfileId: string;
  displayNames: Record<string, string>;
  canManageAll: boolean;
  onClose: () => void;
}) {
  const { session, players } = useGameSession(sessionId);
  const [pending, startTransition] = useTransition();

  if (!session) return null;

  const minPlayers = 2;

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{GAME_LABELS[session.game_type] ?? session.game_type}</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Back
          </Button>
          {canManageAll ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              disabled={pending}
              onClick={() => startTransition(() => deleteGameAction(sessionId, roomId).then(() => {}))}
            >
              Close game
            </Button>
          ) : null}
        </div>
      </div>

      {players.filter((p) => !p.is_spectator).length > 0 ? (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {players
            .filter((p) => !p.is_spectator)
            .map((p) => (
              <span key={p.id}>
                {displayNames[p.profile_id] ?? "Someone"}: {p.score}
              </span>
            ))}
        </div>
      ) : null}

      {session.status === "waiting" ? (
        <GameLobby
          sessionId={sessionId}
          players={players}
          currentProfileId={currentProfileId}
          displayNames={displayNames}
          minPlayers={minPlayers}
          onStart={START_ACTIONS[session.game_type]!}
        />
      ) : session.status === "finished" ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Game over!</p>
          <Button
            size="sm"
            className="self-start"
            disabled={pending}
            onClick={() => startTransition(() => REMATCH_ACTIONS[session.game_type]!(sessionId).then(() => {}))}
          >
            Rematch
          </Button>
        </div>
      ) : session.game_type === "tic_tac_toe" ? (
        <TicTacToeBoard
          sessionId={sessionId}
          state={session.state as never}
          players={players}
          currentProfileId={currentProfileId}
          displayNames={displayNames}
        />
      ) : session.game_type === "trivia" ? (
        <TriviaBoard
          sessionId={sessionId}
          state={session.state as never}
          players={players}
          currentProfileId={currentProfileId}
          displayNames={displayNames}
        />
      ) : session.game_type === "draw_and_guess" ? (
        <DrawAndGuessBoard
          sessionId={sessionId}
          state={session.state as never}
          players={players}
          currentProfileId={currentProfileId}
          displayNames={displayNames}
        />
      ) : (
        <p className="text-sm text-muted-foreground">This game type isn&rsquo;t supported yet.</p>
      )}
    </div>
  );
}
