"use client";

import type { DrawTool, LiveEvent, Stroke } from "@yume/room-schema";
import type { Json } from "@yume/supabase-types";
import type Konva from "konva";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveBroadcast } from "@/lib/live/use-live-broadcast";
import { createClient } from "@/lib/supabase/client";

const CURSOR_THROTTLE_MS = 50;

export function useDrawingLayer(
  roomId: string,
  currentProfileId: string,
  canManageAll: boolean
) {
  const supabase = useMemo(() => createClient(), []);
  const stageRef = useRef<Konva.Stage>(null);
  const lastBroadcastRef = useRef(0);

  const [drawMode, setDrawMode] = useState(false);
  const [tool, setTool] = useState<DrawTool>("pen");
  const [color, setColor] = useState("#1f1f1f");
  const [width, setWidth] = useState(4);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [layerLocked, setLayerLocked] = useState(false);
  const [drawingStroke, setDrawingStroke] = useState<Stroke | null>(null);
  const [liveStrokes, setLiveStrokes] = useState<Record<string, Stroke>>({});
  const [liveCursors, setLiveCursors] = useState<Record<string, { x: number; y: number }>>({});

  const canDraw = !layerLocked || canManageAll;

  useEffect(() => {
    let cancelled = false;

    void supabase
      .from("room_drawings")
      .select("*")
      .eq("room_id", roomId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setStrokes((data.strokes as unknown as Stroke[]) ?? []);
        setLayerLocked(data.layer_locked);
      });

    const channel = supabase
      .channel(`room:${roomId}:drawing`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_drawings", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as { strokes: unknown; layer_locked: boolean } | undefined;
          if (!row) return;
          setStrokes((row.strokes as unknown as Stroke[]) ?? []);
          setLayerLocked(row.layer_locked);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  const handleLiveEvent = useCallback(
    (event: LiveEvent) => {
      if (event.by === currentProfileId) return;

      if (event.kind === "stroke_point") {
        setLiveStrokes((current) => {
          const existing = current[event.strokeId];
          return {
            ...current,
            [event.strokeId]: existing
              ? { ...existing, points: [...existing.points, ...event.points] }
              : {
                  id: event.strokeId,
                  tool: event.tool,
                  color: event.color,
                  width: event.width,
                  points: event.points,
                  authorId: event.by
                }
          };
        });
      } else if (event.kind === "stroke_end") {
        setLiveStrokes((current) => {
          const next = { ...current };
          delete next[event.strokeId];
          return next;
        });
      } else if (event.kind === "cursor") {
        setLiveCursors((current) => ({ ...current, [event.by]: { x: event.x, y: event.y } }));
      }
    },
    [currentProfileId]
  );

  const { send } = useLiveBroadcast(roomId, handleLiveEvent);

  const handlePointerDown = useCallback(
    (x: number, y: number) => {
      if (!drawMode || !canDraw) return;
      setDrawingStroke({
        id: crypto.randomUUID(),
        tool,
        color: tool === "eraser" ? "#000000" : color,
        width: tool === "highlighter" ? width * 3 : width,
        points: [[x, y]],
        authorId: currentProfileId
      });
    },
    [drawMode, canDraw, tool, color, width, currentProfileId]
  );

  const handlePointerMove = useCallback(
    (x: number, y: number) => {
      if (drawMode) send({ kind: "cursor", x, y, by: currentProfileId });

      setDrawingStroke((current) => {
        if (!current) return current;
        const points: Array<[number, number]> = [...current.points, [x, y]];

        const now = Date.now();
        if (now - lastBroadcastRef.current > CURSOR_THROTTLE_MS) {
          lastBroadcastRef.current = now;
          send({
            kind: "stroke_point",
            strokeId: current.id,
            points: points.slice(-5),
            color: current.color,
            width: current.width,
            tool: current.tool,
            by: currentProfileId
          });
        }

        return { ...current, points };
      });
    },
    [drawMode, send, currentProfileId]
  );

  const handlePointerUp = useCallback(() => {
    setDrawingStroke((current) => {
      if (current && current.points.length >= 2) {
        send({ kind: "stroke_end", strokeId: current.id, by: currentProfileId });
        setStrokes((prev) => [...prev, current]);
        void supabase.rpc("append_drawing_stroke", {
          p_room_id: roomId,
          p_stroke: current as unknown as Json
        });
      }
      return null;
    });
  }, [send, currentProfileId, roomId, supabase]);

  const handleClear = useCallback(async () => {
    await supabase.rpc("clear_drawing_layer", { p_room_id: roomId });
    setStrokes([]);
  }, [supabase, roomId]);

  const handleToggleLock = useCallback(async () => {
    const next = !layerLocked;
    await supabase.from("room_drawings").upsert(
      { room_id: roomId, layer_locked: next },
      { onConflict: "room_id" }
    );
    setLayerLocked(next);
  }, [supabase, roomId, layerLocked]);

  const handleExport = useCallback(() => {
    const dataUrl = stageRef.current?.toDataURL({ pixelRatio: 2 });
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "room-drawing.png";
    link.click();
  }, []);

  return {
    stageRef,
    drawMode,
    setDrawMode,
    tool,
    setTool,
    color,
    setColor,
    width,
    setWidth,
    strokes,
    drawingStroke,
    liveStrokes,
    liveCursors,
    layerLocked,
    canDraw,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleClear,
    handleToggleLock,
    handleExport
  };
}
