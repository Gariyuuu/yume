"use client";

import type { RoomPresence } from "@yume/room-schema";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_BUBBLE = { x: 560, y: 360 };

export function useRoomPresence(
  roomId: string,
  self: { profileId: string; displayName: string; avatarUrl: string | null }
) {
  const supabase = useMemo(() => createClient(), []);
  const [participants, setParticipants] = useState<Record<string, RoomPresence>>({});
  const [subscribed, setSubscribed] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [selfState, setSelfState] = useState<RoomPresence>(() => ({
    profileId: self.profileId,
    displayName: self.displayName,
    avatarUrl: self.avatarUrl,
    status: "online",
    bubble: DEFAULT_BUBBLE,
    livekitConnected: false,
    muted: true,
    cameraOn: false,
    speaking: false,
    doNotDisturb: false
  }));

  useEffect(() => {
    // `private: true` + the RLS policies in
    // supabase/migrations/0004_realtime_authorization.sql restrict this
    // channel to members of this room.
    const channel = supabase.channel(`room:${roomId}:presence`, {
      config: { private: true, presence: { key: self.profileId, enabled: true } }
    });
    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<RoomPresence>();
      const next: Record<string, RoomPresence> = {};
      for (const key of Object.keys(state)) {
        const entry = state[key]?.[0];
        if (entry) next[key] = entry;
      }
      setParticipants(next);
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") setSubscribed(true);
    });

    return () => {
      setSubscribed(false);
      void supabase.removeChannel(channel);
    };
  }, [roomId, supabase, self.profileId]);

  // Runs whenever our own presence state changes (including the very
  // first time the channel finishes subscribing), rather than inside the
  // subscribe callback directly, so every field stays in sync with
  // whatever updateSelf() has most recently set.
  useEffect(() => {
    if (subscribed) void channelRef.current?.track(selfState);
  }, [subscribed, selfState]);

  const updateSelf = useCallback((partial: Partial<RoomPresence>) => {
    setSelfState((prev) => ({ ...prev, ...partial }));
  }, []);

  return { participants, self: selfState, updateSelf };
}
