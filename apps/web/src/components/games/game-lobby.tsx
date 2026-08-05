"use client";

import type { GamePlayer } from "@yume/game-sdk";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { joinGameAction, leaveGameAction, readyUpAction } from "@/app/room/[roomId]/games/actions";

export function GameLobby({
  sessionId,
  players,
  currentProfileId,
  displayNames,
  minPlayers,
  onStart
}: {
  sessionId: string;
  players: GamePlayer[];
  currentProfileId: string;
  displayNames: Record<string, string>;
  minPlayers: number;
  /** A specific game's `"use server"` start action reference (e.g.
   *  startTicTacToeGameAction) — passed in rather than a whole
   *  GameEngine, which can't cross the Server Action boundary since it
   *  has function properties. */
  onStart: (sessionId: string) => Promise<{ error?: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const me = players.find((p) => p.profile_id === currentProfileId);
  const activePlayers = players.filter((p) => !p.is_spectator);
  const canStart = activePlayers.length >= minPlayers && activePlayers.every((p) => p.is_ready);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        {players.map((player) => (
          <div key={player.id} className="flex items-center justify-between text-sm">
            <span>
              {displayNames[player.profile_id] ?? "Someone"}
              {player.is_spectator ? " (watching)" : ""}
            </span>
            {!player.is_spectator ? (
              <span className={player.is_ready ? "text-emerald-600" : "text-muted-foreground"}>
                {player.is_ready ? "Ready" : "Not ready"}
              </span>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {!me ? (
          <>
            <Button
              size="sm"
              disabled={pending}
              onClick={() => startTransition(() => joinGameAction(sessionId, false).then(() => {}))}
            >
              Join
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => startTransition(() => joinGameAction(sessionId, true).then(() => {}))}
            >
              Spectate
            </Button>
          </>
        ) : (
          <>
            {!me.is_spectator ? (
              <Button
                size="sm"
                variant={me.is_ready ? "outline" : "default"}
                disabled={pending}
                onClick={() => startTransition(() => readyUpAction(sessionId, !me.is_ready).then(() => {}))}
              >
                {me.is_ready ? "Not ready" : "Ready up"}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => startTransition(() => leaveGameAction(sessionId).then(() => {}))}
            >
              Leave
            </Button>
          </>
        )}
        {canStart ? (
          <Button size="sm" disabled={pending} onClick={() => startTransition(() => onStart(sessionId).then(() => {}))}>
            Start game
          </Button>
        ) : (
          <span className="self-center text-xs text-muted-foreground">
            Waiting for {minPlayers}+ players to ready up…
          </span>
        )}
      </div>
    </div>
  );
}
