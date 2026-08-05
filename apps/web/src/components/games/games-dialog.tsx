"use client";

import type { GameType } from "@yume/game-sdk";
import { useEffect, useState } from "react";
import { createGameAction } from "@/app/room/[roomId]/games/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { GameSessionView } from "./game-session-view";
import { useRoomGames } from "./use-room-games";

const GAME_TYPES: { type: GameType; label: string }[] = [
  { type: "tic_tac_toe", label: "Tic-Tac-Toe" },
  { type: "trivia", label: "Trivia" },
  { type: "draw_and_guess", label: "Draw & Guess" }
];

export function GamesDialog({
  roomId,
  currentProfileId,
  canManageAll
}: {
  roomId: string;
  currentProfileId: string;
  canManageAll: boolean;
}) {
  const sessions = useRoomGames(roomId);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("room_memberships")
      .select("profile_id, profiles(display_name)")
      .eq("room_id", roomId)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        for (const row of data ?? []) {
          if (row.profiles) map[row.profile_id] = row.profiles.display_name;
        }
        setDisplayNames(map);
      });
  }, [roomId]);

  async function handleCreate(gameType: GameType) {
    const result = await createGameAction(roomId, gameType);
    if (result.sessionId) setActiveSessionId(result.sessionId);
  }

  return (
    <Dialog onOpenChange={(open) => !open && setActiveSessionId(null)}>
      <DialogTrigger render={<Button variant="outline" />}>Games</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Room games</DialogTitle>
        </DialogHeader>

        {activeSessionId ? (
          <GameSessionView
            sessionId={activeSessionId}
            roomId={roomId}
            currentProfileId={currentProfileId}
            displayNames={displayNames}
            canManageAll={canManageAll}
            onClose={() => setActiveSessionId(null)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {GAME_TYPES.map(({ type, label }) => (
                <Button key={type} size="sm" variant="outline" onClick={() => void handleCreate(type)}>
                  + {label}
                </Button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No games running — start one above.</p>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    className="flex items-center justify-between rounded-md border p-2 text-left text-sm hover:bg-muted"
                    onClick={() => setActiveSessionId(session.id)}
                  >
                    <span>{GAME_TYPES.find((g) => g.type === session.game_type)?.label ?? session.game_type}</span>
                    <span className="text-xs capitalize text-muted-foreground">
                      {session.status.replace("_", " ")}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
