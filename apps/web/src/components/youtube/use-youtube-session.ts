"use client";

import type { MediaControlMode, MediaQueueItem, MediaSession } from "@yume/room-schema";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useYouTubeSession(roomId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<MediaSession | null>(null);
  const [queue, setQueue] = useState<MediaQueueItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    void supabase
      .from("media_sessions")
      .select("*")
      .eq("room_id", roomId)
      .eq("provider", "youtube")
      .maybeSingle()
      .then(async ({ data }) => {
        if (cancelled) return;
        setSession(data as MediaSession | null);
        if (data) {
          const { data: items } = await supabase
            .from("media_queue_items")
            .select("*")
            .eq("session_id", data.id)
            .order("position");
          if (!cancelled) setQueue((items ?? []) as MediaQueueItem[]);
        }
      });

    const sessionChannel = supabase
      .channel(`room:${roomId}:youtube-session`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "media_sessions", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as MediaSession | undefined;
          if (row?.provider === "youtube") setSession(row);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(sessionChannel);
    };
  }, [roomId, supabase]);

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`media-session:${session.id}:queue`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "media_queue_items", filter: `session_id=eq.${session.id}` },
        () => {
          void supabase
            .from("media_queue_items")
            .select("*")
            .eq("session_id", session.id)
            .order("position")
            .then(({ data }) => setQueue((data ?? []) as MediaQueueItem[]));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session, supabase]);

  async function ensureSession(): Promise<MediaSession> {
    if (session) return session;
    const { data } = await supabase
      .from("media_sessions")
      .insert({ room_id: roomId, provider: "youtube" })
      .select("*")
      .single();
    const created = data as MediaSession;
    setSession(created);
    return created;
  }

  async function addToQueue(videoId: string, title?: string) {
    const current = await ensureSession();
    const { data } = await supabase
      .from("media_queue_items")
      .insert({
        session_id: current.id,
        provider: "youtube",
        external_id: videoId,
        title: title ?? null,
        position: queue.length
      })
      .select("*")
      .single();

    if (!current.current_item_id && data) {
      await supabase
        .from("media_sessions")
        .update({ current_item_id: data.id, playback_state: "playing", position_ms: 0 })
        .eq("id", current.id);
    }
  }

  async function removeFromQueue(itemId: string) {
    await supabase.from("media_queue_items").delete().eq("id", itemId);
  }

  async function playItem(itemId: string) {
    if (!session) return;
    await supabase
      .from("media_sessions")
      .update({ current_item_id: itemId, playback_state: "playing", position_ms: 0 })
      .eq("id", session.id);
  }

  async function setPlaybackState(playing: boolean, positionMs: number) {
    if (!session) return;
    await supabase
      .from("media_sessions")
      .update({ playback_state: playing ? "playing" : "paused", position_ms: Math.round(positionMs) })
      .eq("id", session.id);
  }

  async function playNext() {
    if (!session) return;
    const currentIndex = queue.findIndex((item) => item.id === session.current_item_id);
    const next = queue[currentIndex + 1];
    if (next) await playItem(next.id);
  }

  async function setControlMode(mode: MediaControlMode) {
    const current = await ensureSession();
    await supabase.from("media_sessions").update({ control_mode: mode }).eq("id", current.id);
  }

  const currentItem = queue.find((item) => item.id === session?.current_item_id) ?? null;

  return {
    session,
    queue,
    currentItem,
    addToQueue,
    removeFromQueue,
    playItem,
    setPlaybackState,
    playNext,
    setControlMode
  };
}
