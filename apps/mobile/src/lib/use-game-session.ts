import type { GamePlayer, GameSession } from "@yume/game-sdk";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

/** Mirrors apps/web/src/components/games/use-game-session.ts. */
export function useGameSession(sessionId: string) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchPlayers() {
      const { data } = await supabase.from("game_players").select("*").eq("session_id", sessionId).order("joined_at");
      return (data ?? []) as GamePlayer[];
    }

    void supabase
      .from("game_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()
      .then(({ data }) => {
        if (!cancelled) setSession(data as GameSession | null);
      });
    void fetchPlayers().then((data) => !cancelled && setPlayers(data));

    const channel = supabase
      .channel(`game-session:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_sessions", filter: `id=eq.${sessionId}` },
        (payload) => setSession(payload.new as GameSession)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_players", filter: `session_id=eq.${sessionId}` },
        () => void fetchPlayers().then((data) => !cancelled && setPlayers(data))
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return { session, players };
}
