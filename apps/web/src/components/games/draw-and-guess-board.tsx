"use client";

import type { DrawAndGuessState, GamePlayer } from "@yume/game-sdk";
import { useState, useTransition } from "react";
import {
  revealDrawAction,
  startDrawRoundAction,
  submitGuessAction
} from "@/app/room/[roomId]/games/draw-and-guess-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DrawAndGuessCanvasLoader } from "./draw-and-guess-canvas-loader";

export function DrawAndGuessBoard({
  sessionId,
  state,
  players,
  currentProfileId,
  displayNames
}: {
  sessionId: string;
  state: DrawAndGuessState;
  players: GamePlayer[];
  currentProfileId: string;
  displayNames: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();
  const [guess, setGuess] = useState("");
  const isDrawer = state.drawerId === currentProfileId;
  const isPlayer = players.some((p) => p.profile_id === currentProfileId && !p.is_spectator);
  const iGuessedCorrectly = state.guesses.some((g) => g.profileId === currentProfileId && g.correct);
  const nextDrawerId = state.drawerOrder[(state.roundIndex + 1) % state.drawerOrder.length];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Round {Math.max(state.roundIndex + 1, 0)} of {state.totalRounds}
      </p>

      {state.phase === "waiting" || state.phase === "reveal" ? (
        <div className="flex flex-col gap-1">
          {state.phase === "reveal" ? (
            <p className="text-sm">
              The word was{" "}
              <strong className="fx-blackout">{state.revealedWord}</strong>
              .
            </p>
          ) : null}
          {nextDrawerId === currentProfileId ? (
            <Button
              size="sm"
              className="self-start"
              disabled={pending}
              onClick={() => startTransition(() => startDrawRoundAction(sessionId).then(() => {}))}
            >
              Start my turn drawing
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Waiting for {displayNames[nextDrawerId!] ?? "the next player"} to start drawing…
            </p>
          )}
        </div>
      ) : null}

      {state.phase === "drawing" ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            {isDrawer ? (
              <>
                Draw: <strong>{state.category}</strong>
              </>
            ) : (
              <>
                {displayNames[state.drawerId!] ?? "Someone"} is drawing · {state.category} ·{" "}
                {"_ ".repeat(state.wordLength ?? 0)}
              </>
            )}
          </p>

          <DrawAndGuessCanvasLoader sessionId={sessionId} isDrawer={isDrawer} />

          {!isDrawer && isPlayer && !iGuessedCorrectly ? (
            <div className="flex gap-2">
              <Input
                placeholder="Your guess…"
                value={guess}
                onChange={(event) => setGuess(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && guess.trim()) {
                    startTransition(() => submitGuessAction(sessionId, guess.trim()).then(() => {}));
                    setGuess("");
                  }
                }}
              />
              <Button
                size="sm"
                disabled={pending || !guess.trim()}
                onClick={() => {
                  startTransition(() => submitGuessAction(sessionId, guess.trim()).then(() => {}));
                  setGuess("");
                }}
              >
                Guess
              </Button>
            </div>
          ) : null}

          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            {state.guesses.slice(-5).map((g, index) => (
              <span key={index}>
                {displayNames[g.profileId] ?? "Someone"}: {g.correct ? "guessed it! 🎉" : g.guess}
              </span>
            ))}
          </div>

          {isDrawer ? (
            <Button
              size="sm"
              variant="ghost"
              className="self-start"
              disabled={pending}
              onClick={() => startTransition(() => revealDrawAction(sessionId).then(() => {}))}
            >
              Reveal word / end round
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
