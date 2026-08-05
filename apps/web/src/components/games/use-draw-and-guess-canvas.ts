"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type StrokeMessage = { strokeId: string; points: number[]; done?: boolean };

/**
 * Purely ephemeral live-drawing broadcast scoped to one game session —
 * unlike the room decoration drawing layer (Phase 4), nothing here is
 * persisted: the sketch resets every round by design.
 */
export function useDrawAndGuessCanvas(sessionId: string, isDrawer: boolean) {
  const [strokes, setStrokes] = useState<Record<string, number[]>>({});
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`game:${sessionId}:draw`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "stroke" }, ({ payload }) => {
        const { strokeId, points } = payload as StrokeMessage;
        setStrokes((current) => ({ ...current, [strokeId]: points }));
      })
      .on("broadcast", { event: "clear" }, () => setStrokes({}))
      .subscribe();

    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const broadcastStroke = useCallback((strokeId: string, points: number[]) => {
    void channelRef.current?.send({ type: "broadcast", event: "stroke", payload: { strokeId, points } });
  }, []);

  const clearStrokes = useCallback(() => {
    setStrokes({});
    void channelRef.current?.send({ type: "broadcast", event: "clear", payload: {} });
  }, []);

  function addLocalPoints(strokeId: string, points: number[]) {
    setStrokes((current) => ({ ...current, [strokeId]: points }));
    if (isDrawer) broadcastStroke(strokeId, points);
  }

  return { strokes, addLocalPoints, clearStrokes };
}
