"use client";

import type { LiveEvent } from "@yume/room-schema";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Tier-1 ephemeral channel (`room:{roomId}:live`) — see
 * docs/phase-1/05-sync-protocol.md §3. Used for in-progress drag
 * positions and live drawing strokes; never touches Postgres. Gated by
 * the same Realtime Authorization RLS as presence (see
 * supabase/migrations/0004_realtime_authorization.sql).
 */
export function useLiveBroadcast(roomId: string, onEvent: (event: LiveEvent) => void) {
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const channel = supabase.channel(`room:${roomId}:live`, {
      config: { private: true, broadcast: { self: false } }
    });
    channelRef.current = channel;
    subscribedRef.current = false;

    channel.on("broadcast", { event: "live" }, ({ payload }) => {
      onEventRef.current(payload as LiveEvent);
    });

    channel.subscribe((status) => {
      subscribedRef.current = status === "SUBSCRIBED";
    });

    return () => {
      subscribedRef.current = false;
      void supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  const send = useCallback((event: LiveEvent) => {
    if (!subscribedRef.current) return;
    void channelRef.current?.send({ type: "broadcast", event: "live", payload: event });
  }, []);

  return { send };
}
