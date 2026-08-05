"use client";

import type { LiveEvent, RoomAsset, RoomObject, RoomObjectType } from "@yume/room-schema";
import type { Json } from "@yume/supabase-types";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Stage, Transformer } from "react-konva";
import { useLiveBroadcast } from "@/lib/live/use-live-broadcast";
import { createClient } from "@/lib/supabase/client";
import { DecorationToolbar } from "./decoration-toolbar";
import { ROOM_HEIGHT, ROOM_WIDTH } from "./room-dimensions";
import { RoomObjectShape } from "./room-object-shape";
import { TextEditOverlay } from "./text-edit-overlay";
import { useAutosave } from "./use-autosave";
import { useUndoRedo } from "./use-undo-redo";

const GRID_SIZE = 20;

export type PendingAsset =
  | { source: "library"; asset: RoomAsset }
  | { source: "builtin"; type: "text" | "sticky_note" };

export function RoomCanvas({
  roomId,
  initialObjects,
  currentProfileId,
  canManageAll,
  overlay,
  pendingAsset,
  onAssetPlaced
}: {
  roomId: string;
  initialObjects: RoomObject[];
  currentProfileId: string;
  canManageAll: boolean;
  overlay?: React.ReactNode;
  pendingAsset?: PendingAsset | null;
  onAssetPlaced?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [objects, setObjects] = useState<Record<string, RoomObject>>(() =>
    Object.fromEntries(initialObjects.map((object) => [object.id, object]))
  );
  const [liveOverrides, setLiveOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(false);

  const shapeRefs = useRef<Map<string, Konva.Node>>(new Map());
  const transformerRef = useRef<Konva.Transformer>(null);

  function canManageObject(object: RoomObject) {
    return canManageAll || object.owner_id === currentProfileId;
  }

  // Tier 2: persisted object create/update/delete fan out to everyone in
  // the room via Postgres Changes — see docs/phase-1/05-sync-protocol.md §4.
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

  // Tier 1: everyone else's in-progress drags, purely visual until they
  // release and the Tier-2 write above confirms the real position.
  const handleLiveEvent = useCallback(
    (event: LiveEvent) => {
      if (event.kind !== "object_drag" || event.by === currentProfileId) return;
      setLiveOverrides((current) => ({ ...current, [event.objectId]: { x: event.x, y: event.y } }));
    },
    [currentProfileId]
  );
  const { send: sendLive } = useLiveBroadcast(roomId, handleLiveEvent);

  useEffect(() => {
    if (transformerRef.current) {
      const nodes = selectedIds
        .map((id) => shapeRefs.current.get(id))
        .filter((node): node is Konva.Node => Boolean(node));
      transformerRef.current.nodes(nodes);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedIds]);

  async function insertObject(spec: {
    type: RoomObjectType;
    asset_url?: string | null;
    x: number;
    y: number;
    width: number;
    height: number;
    data?: Record<string, unknown> | null;
  }): Promise<RoomObject | null> {
    const { data, error } = await supabase
      .from("room_objects")
      .insert({
        room_id: roomId,
        type: spec.type,
        asset_url: spec.asset_url ?? null,
        x: spec.x,
        y: spec.y,
        width: spec.width,
        height: spec.height,
        rotation: 0,
        z_index: Object.keys(objects).length,
        owner_id: currentProfileId,
        data: (spec.data ?? null) as Json | null
      })
      .select("*")
      .single();

    if (error || !data) return null;
    const object = data as RoomObject;
    setObjects((current) => ({ ...current, [object.id]: object }));
    return object;
  }

  async function deleteObjectRemote(id: string) {
    await supabase.from("room_objects").delete().eq("id", id);
    setObjects((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function recreateObjectRemote(object: RoomObject) {
    await supabase.from("room_objects").insert({
      id: object.id,
      room_id: object.room_id,
      type: object.type,
      asset_url: object.asset_url,
      x: object.x,
      y: object.y,
      width: object.width,
      height: object.height,
      rotation: object.rotation,
      z_index: object.z_index,
      locked: object.locked,
      owner_id: object.owner_id,
      interaction_permissions: object.interaction_permissions as Json,
      data: object.data as Json | null
    });
    setObjects((current) => ({ ...current, [object.id]: object }));
  }

  async function updateObjectRemote(
    id: string,
    patch: Partial<
      Pick<RoomObject, "x" | "y" | "width" | "height" | "rotation" | "z_index" | "locked" | "data">
    >
  ) {
    await supabase
      .from("room_objects")
      .update({ ...patch, data: patch.data as Json | undefined, updated_by: currentProfileId })
      .eq("id", id);
    setObjects((current) => {
      const existing = current[id];
      if (!existing) return current;
      return { ...current, [id]: { ...existing, ...patch } };
    });
  }

  const { push: pushUndo, undo, redo, canUndo, canRedo } = useUndoRedo((entry, direction) => {
    if (entry.kind === "create") {
      void (direction === "undo" ? deleteObjectRemote(entry.object.id) : recreateObjectRemote(entry.object));
    } else if (entry.kind === "delete") {
      void (direction === "undo" ? recreateObjectRemote(entry.object) : deleteObjectRemote(entry.object.id));
    } else {
      void updateObjectRemote(entry.id, direction === "undo" ? entry.before : entry.after);
    }
  });

  useAutosave(roomId, objects);

  async function handleAddAtPosition(x: number, y: number) {
    if (!pendingAsset) return;

    const spec =
      pendingAsset.source === "library"
        ? {
            type: pendingAsset.asset.category as RoomObjectType,
            asset_url: pendingAsset.asset.asset_url,
            x,
            y,
            width: 100,
            height: 100
          }
        : pendingAsset.type === "text"
          ? { type: "text" as const, x, y, width: 160, height: 50, data: { text: "Text" } }
          : { type: "sticky_note" as const, x, y, width: 120, height: 120, data: { text: "New note" } };

    const object = await insertObject(spec);
    if (object) pushUndo({ kind: "create", object });
    onAssetPlaced?.();
  }

  function handleSelect(id: string, event: KonvaEventObject<MouseEvent | TouchEvent>) {
    const additive = "shiftKey" in event.evt && event.evt.shiftKey;
    setSelectedIds((current) => {
      if (additive) {
        return current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id];
      }
      return [id];
    });
  }

  function handleStageMouseDown(event: KonvaEventObject<MouseEvent | TouchEvent>) {
    const stage = event.target.getStage();
    if (event.target !== stage) return;

    if (pendingAsset) {
      const pointer = stage?.getPointerPosition();
      if (pointer) void handleAddAtPosition(pointer.x, pointer.y);
      return;
    }

    setSelectedIds([]);
  }

  function handleDragMove(object: RoomObject, x: number, y: number) {
    sendLive({ kind: "object_drag", objectId: object.id, x, y, by: currentProfileId });
  }

  async function handleDragEnd(object: RoomObject, x: number, y: number) {
    const snapped = snapToGrid
      ? { x: Math.round(x / GRID_SIZE) * GRID_SIZE, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
      : { x, y };

    setLiveOverrides((current) => {
      const next = { ...current };
      delete next[object.id];
      return next;
    });

    await updateObjectRemote(object.id, snapped);
    pushUndo({
      kind: "update",
      id: object.id,
      before: { x: object.x, y: object.y },
      after: snapped
    });
  }

  function handleTransformEnd() {
    const nodes = transformerRef.current?.nodes() ?? [];
    for (const node of nodes) {
      const object = objects[node.id()];
      if (!object) continue;

      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      const patch = {
        width: Math.max(20, Math.round(object.width * scaleX)),
        height: Math.max(20, Math.round(object.height * scaleY)),
        rotation: Math.round(node.rotation())
      };
      node.scaleX(1);
      node.scaleY(1);

      void updateObjectRemote(object.id, patch);
      pushUndo({
        kind: "update",
        id: object.id,
        before: { width: object.width, height: object.height, rotation: object.rotation },
        after: patch
      });
    }
  }

  async function handleDuplicate() {
    for (const id of selectedIds) {
      const object = objects[id];
      if (!object || !canManageObject(object)) continue;

      const copy = await insertObject({
        type: object.type,
        asset_url: object.asset_url,
        x: object.x + 24,
        y: object.y + 24,
        width: object.width,
        height: object.height,
        data: object.data
      });
      if (copy) pushUndo({ kind: "create", object: copy });
    }
  }

  async function handleDeleteSelected() {
    for (const id of selectedIds) {
      const object = objects[id];
      if (!object || !canManageObject(object)) continue;
      await deleteObjectRemote(id);
      pushUndo({ kind: "delete", object });
    }
    setSelectedIds([]);
  }

  async function handleToggleLock() {
    const targets = selectedIds
      .map((id) => objects[id])
      .filter((o): o is RoomObject => o !== undefined && canManageObject(o));
    if (targets.length === 0) return;
    const nextLocked = !targets.every((object) => object.locked);

    for (const object of targets) {
      await updateObjectRemote(object.id, { locked: nextLocked });
      pushUndo({ kind: "update", id: object.id, before: { locked: object.locked }, after: { locked: nextLocked } });
    }
  }

  async function handleLayerShift(direction: 1 | -1) {
    for (const id of selectedIds) {
      const object = objects[id];
      if (!object || !canManageObject(object)) continue;
      const nextZ = object.z_index + direction;
      await updateObjectRemote(object.id, { z_index: nextZ });
      pushUndo({ kind: "update", id: object.id, before: { z_index: object.z_index }, after: { z_index: nextZ } });
    }
  }

  const objectList = Object.values(objects).sort((a, b) => a.z_index - b.z_index);
  const selectedObjects = selectedIds.map((id) => objects[id]).filter((o): o is RoomObject => Boolean(o));
  const editingObject = editingId ? objects[editingId] : null;

  return (
    <div className="flex flex-col gap-3">
      <DecorationToolbar
        hasSelection={selectedObjects.length > 0}
        allLocked={selectedObjects.length > 0 && selectedObjects.every((o) => o.locked)}
        snapToGrid={snapToGrid}
        canUndo={canUndo}
        canRedo={canRedo}
        onDuplicate={() => void handleDuplicate()}
        onDelete={() => void handleDeleteSelected()}
        onToggleLock={() => void handleToggleLock()}
        onBringForward={() => void handleLayerShift(1)}
        onSendBackward={() => void handleLayerShift(-1)}
        onToggleSnap={() => setSnapToGrid((v) => !v)}
        onUndo={undo}
        onRedo={redo}
      />

      <div
        className="relative w-full overflow-auto rounded-card border bg-room-bg"
        style={{ cursor: pendingAsset ? "copy" : undefined }}
      >
        <Stage width={ROOM_WIDTH} height={ROOM_HEIGHT} onMouseDown={handleStageMouseDown}>
          <Layer>
            {objectList.map((object) => {
              const displayObject = liveOverrides[object.id]
                ? { ...object, ...liveOverrides[object.id] }
                : object;
              return (
                <RoomObjectShape
                  key={object.id}
                  object={displayObject}
                  selected={selectedIds.includes(object.id)}
                  canDrag={canManageObject(object) && !object.locked}
                  onSelect={(event) => handleSelect(object.id, event)}
                  onDragMove={(x, y) => handleDragMove(object, x, y)}
                  onDragEnd={(x, y) => void handleDragEnd(object, x, y)}
                  onDoubleClick={() => {
                    if (object.type === "text" || object.type === "sticky_note") {
                      setEditingId(object.id);
                    }
                  }}
                  registerRef={(node) => {
                    if (node) shapeRefs.current.set(object.id, node);
                    else shapeRefs.current.delete(object.id);
                  }}
                />
              );
            })}
            <Transformer
              ref={transformerRef}
              rotateEnabled
              boundBoxFunc={(oldBox, newBox) =>
                newBox.width < 20 || newBox.height < 20 ? oldBox : newBox
              }
              onTransformEnd={handleTransformEnd}
            />
          </Layer>
        </Stage>

        {editingObject ? (
          <TextEditOverlay
            object={editingObject}
            onSave={(text) => {
              void updateObjectRemote(editingObject.id, { data: { ...editingObject.data, text } });
              setEditingId(null);
            }}
            onCancel={() => setEditingId(null)}
          />
        ) : null}

        {overlay}
      </div>
    </div>
  );
}
