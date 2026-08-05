"use client";

import type { Timer, TimerMode, TimerType } from "@yume/room-schema";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useRoomTimers(roomId: string, currentProfileId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [timers, setTimers] = useState<Record<string, Timer>>({});

  useEffect(() => {
    let cancelled = false;

    void supabase
      .from("timers")
      .select("*")
      .eq("room_id", roomId)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setTimers(Object.fromEntries((data as Timer[]).map((t) => [t.id, t])));
      });

    const channel = supabase
      .channel(`room:${roomId}:timers`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "timers", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setTimers((current) => {
            const next = { ...current };
            if (payload.eventType === "DELETE") {
              const oldId = (payload.old as { id?: string }).id;
              if (oldId) delete next[oldId];
              return next;
            }
            const row = payload.new as Timer;
            next[row.id] = row;
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  async function createTimer(spec: {
    type: TimerType;
    mode: TimerMode;
    durationSeconds?: number;
    targetAt?: string;
    alarmSound?: string;
  }) {
    await supabase.from("timers").insert({
      room_id: roomId,
      type: spec.type,
      mode: spec.mode,
      owner_id: currentProfileId,
      duration_seconds: spec.durationSeconds ?? null,
      target_at: spec.targetAt ?? null,
      alarm_sound: spec.alarmSound ?? null
    });
  }

  async function start(id: string) {
    await supabase
      .from("timers")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function pause(id: string) {
    await supabase.from("timers").update({ status: "paused" }).eq("id", id);
  }

  async function reset(id: string) {
    await supabase.from("timers").update({ status: "idle", started_at: null }).eq("id", id);
  }

  async function remove(id: string) {
    await supabase.from("timers").delete().eq("id", id);
  }

  async function markFinished(id: string) {
    await supabase.from("timers").update({ status: "finished" }).eq("id", id);
  }

  return {
    timers: Object.values(timers).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    createTimer,
    start,
    pause,
    reset,
    remove,
    markFinished
  };
}
