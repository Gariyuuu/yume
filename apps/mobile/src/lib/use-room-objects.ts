import type { RoomObject } from "@yume/room-schema";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

/** Same Tier-2-only model as the web canvas (Phase 2/4) — see
 *  docs/phase-1/05-sync-protocol.md. No Tier-1 live-drag broadcast on
 *  mobile yet (tracked as a follow-up alongside multi-select/resize). */
export function useRoomObjects(roomId: string) {
  const [objects, setObjects] = useState<Record<string, RoomObject>>({});

  useEffect(() => {
    let cancelled = false;

    void supabase
      .from("room_objects")
      .select("*")
      .eq("room_id", roomId)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setObjects(Object.fromEntries((data as RoomObject[]).map((object) => [object.id, object])));
      });

    const channel = supabase
      .channel(`room:${roomId}:objects`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_objects", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setObjects((current) => {
            const next = { ...current };
            if (payload.eventType === "DELETE") {
              const oldId = (payload.old as { id?: string }).id;
              if (oldId) delete next[oldId];
              return next;
            }
            const row = payload.new as RoomObject;
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
  }, [roomId]);

  return { objects, setObjects };
}
