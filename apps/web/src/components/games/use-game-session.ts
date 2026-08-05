"use client";

import type { GamePlayer, GameSession } from "@yume/game-sdk";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useGameSession(sessionId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchPlayers() {
      const { data } = await supabase
        .from("game_players")
        .select("*")
        .eq("session_id", sessionId)
        .order("joined_at");
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
  }, [sessionId, supabase]);

  return { session, players };
}
