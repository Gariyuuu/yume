"use client";

import type { RoomObject } from "@yume/room-schema";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useMemo, useState } from "react";
import { Group, Layer, Rect, Stage, Text } from "react-konva";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { ROOM_HEIGHT, ROOM_WIDTH } from "./room-dimensions";

const OBJECT_COLORS: Partial<Record<RoomObject["type"], string>> = {
  sticky_note: "#fde68a",
  furniture: "#d6b98c",
  rug: "#f0b7c4",
  plant: "#86c98a",
  decorative: "#c7b8ff"
};

export function RoomCanvas({
  roomId,
  initialObjects,
  currentProfileId,
  canManageAll,
  overlay
}: {
  roomId: string;
  initialObjects: RoomObject[];
  currentProfileId: string;
  canManageAll: boolean;
  /** Rendered absolutely-positioned inside the same container as the Stage,
   *  at the same (0,0) origin — see components/call/participant-bubbles-layer.tsx. */
  overlay?: React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [objects, setObjects] = useState<Record<string, RoomObject>>(() =>
    Object.fromEntries(initialObjects.map((object) => [object.id, object]))
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Tier 2 persistence only for Phase 2 (see docs/phase-1/05-sync-protocol.md):
  // final positions/creates/deletes fan out via Postgres Changes. Live
  // in-drag broadcast (Tier 1) arrives in Phase 4.
  useEffect(() => {
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
      void supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  function canManageObject(object: RoomObject) {
    return canManageAll || object.owner_id === currentProfileId;
  }

  async function handleDragEnd(object: RoomObject, event: KonvaEventObject<DragEvent>) {
    const x = event.target.x();
    const y = event.target.y();

    setObjects((current) => ({ ...current, [object.id]: { ...object, x, y } }));

    await supabase
      .from("room_objects")
      .update({ x, y, updated_by: currentProfileId })
      .eq("id", object.id);
  }

  async function handleAddStickyNote() {
    const { data, error } = await supabase
      .from("room_objects")
      .insert({
        room_id: roomId,
        type: "sticky_note",
        x: ROOM_WIDTH / 2 - 60,
        y: ROOM_HEIGHT / 2 - 60,
        width: 120,
        height: 120,
        owner_id: currentProfileId,
        data: { text: "New note" }
      })
      .select("*")
      .single();

    if (!error && data) {
      setObjects((current) => ({ ...current, [data.id]: data as RoomObject }));
    }
  }

  async function handleDeleteSelected() {
    if (!selectedId) return;
    const object = objects[selectedId];
    if (!object || !canManageObject(object)) return;

    await supabase.from("room_objects").delete().eq("id", selectedId);
    setObjects((current) => {
      const next = { ...current };
      delete next[selectedId];
      return next;
    });
    setSelectedId(null);
  }

  const objectList = Object.values(objects);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleAddStickyNote}>
          Add sticky note
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!selectedId || !objects[selectedId] || !canManageObject(objects[selectedId]!)}
          onClick={handleDeleteSelected}
        >
          Delete selected
        </Button>
      </div>

      <div className="relative w-full overflow-auto rounded-card border bg-room-bg">
        <Stage
          width={ROOM_WIDTH}
          height={ROOM_HEIGHT}
          onMouseDown={(event) => {
            if (event.target === event.target.getStage()) setSelectedId(null);
          }}
        >
          <Layer>
            {objectList.map((object) => {
              const canDrag = canManageObject(object) && !object.locked;
              const isSelected = object.id === selectedId;
              return (
                <Group key={object.id}>
                  <Rect
                    x={object.x}
                    y={object.y}
                    width={object.width}
                    height={object.height}
                    rotation={object.rotation}
                    fill={OBJECT_COLORS[object.type] ?? "#e5e7eb"}
                    stroke={isSelected ? "#9f22cd" : undefined}
                    strokeWidth={isSelected ? 3 : 0}
                    cornerRadius={12}
                    draggable={canDrag}
                    onClick={() => setSelectedId(object.id)}
                    onTap={() => setSelectedId(object.id)}
                    onDragEnd={(event) => handleDragEnd(object, event)}
                  />
                  {object.type === "sticky_note" ? (
                    <Text
                      x={object.x + 10}
                      y={object.y + 10}
                      width={object.width - 20}
                      text={
                        typeof object.data?.["text"] === "string"
                          ? (object.data["text"] as string)
                          : ""
                      }
                      fontSize={14}
                      listening={false}
                    />
                  ) : null}
                </Group>
              );
            })}
          </Layer>
        </Stage>
        {overlay}
      </div>
    </div>
  );
}
