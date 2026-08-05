"use client";

import type { GamePlayer, TriviaState } from "@yume/game-sdk";
import { useTransition } from "react";
import { answerTriviaAction, revealTriviaAction, startTriviaRoundAction } from "@/app/room/[roomId]/games/trivia-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TriviaBoard({
  sessionId,
  state,
  players,
  currentProfileId,
  displayNames
}: {
  sessionId: string;
  state: TriviaState;
  players: GamePlayer[];
  currentProfileId: string;
  displayNames: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();
  const isPlayer = players.some((p) => p.profile_id === currentProfileId && !p.is_spectator);
  const activeCount = players.filter((p) => !p.is_spectator).length;
  const answeredCount = Object.keys(state.answers).length;
  const myAnswer = state.answers[currentProfileId];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Round {Math.max(state.roundIndex + 1, 0)} of {state.totalRounds}
      </p>

      {state.phase === "waiting" || state.phase === "reveal" ? (
        isPlayer ? (
          <Button
            size="sm"
            disabled={pending || state.roundIndex + 1 >= state.totalRounds}
            onClick={() => startTransition(() => startTriviaRoundAction(sessionId).then(() => {}))}
          >
            {state.phase === "waiting" ? "Start round" : "Next question"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Waiting for the next question…</p>
        )
      ) : null}

      {state.phase === "reveal" && state.question ? (
        <div className="flex flex-col gap-1 rounded-md border p-2">
          <p className="text-sm font-medium">{state.question.text}</p>
          {state.question.choices.map((choice, index) => (
            <div
              key={choice}
              className={cn(
                "rounded px-2 py-1 text-sm",
                index === state.correctIndex ? "bg-emerald-100 font-medium" : "bg-muted/50"
              )}
            >
              {choice}
            </div>
          ))}
          <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
            {Object.entries(state.answers).map(([profileId, choiceIndex]) => (
              <span key={profileId}>
                {displayNames[profileId] ?? "Someone"}: {state.question!.choices[choiceIndex]}{" "}
                {choiceIndex === state.correctIndex ? "✅" : "❌"}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {state.phase === "question" && state.question ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase text-muted-foreground">{state.question.category}</p>
          <p className="font-medium">{state.question.text}</p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {state.question.choices.map((choice, index) => (
              <Button
                key={choice}
                size="sm"
                variant={myAnswer === index ? "default" : "outline"}
                disabled={pending || !isPlayer || myAnswer !== undefined}
                onClick={() => startTransition(() => answerTriviaAction(sessionId, index).then(() => {}))}
              >
                {choice}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {answeredCount}/{activeCount} answered
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="self-start"
            disabled={pending}
            onClick={() => startTransition(() => revealTriviaAction(sessionId).then(() => {}))}
          >
            Reveal answer
          </Button>
        </div>
      ) : null}
    </div>
  );
}
