import type { GameSession } from "@yume/game-sdk";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

/** Mirrors apps/web/src/components/games/use-room-games.ts. */
export function useRoomGames(roomId: string) {
  const [sessions, setSessions] = useState<GameSession[]>([]);

  useEffect(() => {
    let cancelled = false;

    void supabase
      .from("game_sessions")
      .select("*")
      .eq("room_id", roomId)
      .neq("status", "finished")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setSessions((data ?? []) as GameSession[]);
      });

    const channel = supabase
      .channel(`room:${roomId}:games`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_sessions", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setSessions((current) => {
            if (payload.eventType === "DELETE") {
              const oldId = (payload.old as { id?: string }).id;
              return current.filter((s) => s.id !== oldId);
            }
            const row = payload.new as GameSession;
            if (row.status === "finished") return current.filter((s) => s.id !== row.id);
            const exists = current.some((s) => s.id === row.id);
            return exists ? current.map((s) => (s.id === row.id ? row : s)) : [row, ...current];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  return sessions;
}
