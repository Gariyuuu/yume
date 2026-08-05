import { Canvas, Group, useCanvasRef } from "@shopify/react-native-skia";
import type { RoomAsset, RoomObject, RoomObjectType } from "@yume/room-schema";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { AssetThumbnail } from "./AssetThumbnail";
import { RoomObjectShape } from "./RoomObjectShape";
import { ROOM_HEIGHT, ROOM_WIDTH } from "../lib/room-dimensions";
import { supabase } from "../lib/supabase";
import { useRoomObjects } from "../lib/use-room-objects";

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_THRESHOLD = 6;

/**
 * The interactive counterpart to web's Konva canvas (Phase 2/4) — same
 * room-object model and coordinate space (docs/phase-1/02-architecture.md
 * §3), rendered with Skia instead. Scoped down from web's toolset for
 * this pass: single-object drag (no multi-select/resize/rotate
 * transformer), tap-and-hold to delete (no lock/duplicate/layer-order
 * controls), no Tier-1 live-drag broadcast, no drawing layer or notes.
 * Those are real follow-up work, not implemented as stubs.
 */
export function RoomCanvasView({
  roomId,
  currentProfileId,
  canManageAll,
  onCanvasRef
}: {
  roomId: string;
  currentProfileId: string;
  canManageAll: boolean;
  onCanvasRef?: (ref: ReturnType<typeof useCanvasRef>) => void;
}) {
  const { objects, setObjects } = useRoomObjects(roomId);
  const canvasRef = useCanvasRef();
  // `canvasRef` is a stable ref object across renders, so handing it up
  // once on mount is enough — no need to re-run this on every render.
  useEffect(() => {
    onCanvasRef?.(canvasRef);
  }, [onCanvasRef, canvasRef]);
  const [assets, setAssets] = useState<RoomAsset[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  const objectsRef = useRef(objects);
  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    void supabase
      .from("room_assets")
      .select("*")
      .eq("is_active", true)
      .then(({ data }) => setAssets((data ?? []) as RoomAsset[]));
  }, []);

  const displayWidth = Math.min(Dimensions.get("window").width - 32, 700);
  const scale = displayWidth / ROOM_WIDTH;
  const displayHeight = ROOM_HEIGHT * scale;

  function canManageObject(object: RoomObject) {
    return canManageAll || object.owner_id === currentProfileId;
  }

  function hitTest(roomX: number, roomY: number): RoomObject | null {
    const candidates = Object.values(objectsRef.current).sort((a, b) => b.z_index - a.z_index);
    for (const object of candidates) {
      if (!canManageObject(object) || object.locked) continue;
      if (
        roomX >= object.x &&
        roomX <= object.x + object.width &&
        roomY >= object.y &&
        roomY <= object.y + object.height
      ) {
        return object;
      }
    }
    return null;
  }

  async function persistPosition(id: string, x: number, y: number) {
    await supabase.from("room_objects").update({ x, y, updated_by: currentProfileId }).eq("id", id);
    setObjects((current) => {
      const existing = current[id];
      return existing ? { ...current, [id]: { ...existing, x, y } } : current;
    });
  }

  async function deleteObject(id: string) {
    await supabase.from("room_objects").delete().eq("id", id);
    setObjects((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function addObject(spec: {
    type: RoomObjectType;
    asset_url?: string | null;
    data?: Record<string, unknown> | null;
  }) {
    const { data } = await supabase
      .from("room_objects")
      .insert({
        room_id: roomId,
        type: spec.type,
        asset_url: spec.asset_url ?? null,
        x: ROOM_WIDTH / 2 - 50,
        y: ROOM_HEIGHT / 2 - 50,
        width: 100,
        height: 100,
        owner_id: currentProfileId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- data is jsonb; RoomObject's app-level type is narrower than what insert() accepts
        data: (spec.data ?? null) as any
      })
      .select("*")
      .single();

    if (data) setObjects((current) => ({ ...current, [(data as RoomObject).id]: data as RoomObject }));
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const roomX = event.nativeEvent.locationX / scale;
          const roomY = event.nativeEvent.locationY / scale;
          const target = hitTest(roomX, roomY);
          if (!target) return;

          setDragId(target.id);
          setDragPos({ x: target.x, y: target.y });

          const longPressTimer = setTimeout(() => {
            Alert.alert("Delete this?", undefined, [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => void deleteObject(target.id) }
            ]);
          }, LONG_PRESS_MS);
          longPressTimerRef.current = longPressTimer;
          dragStartRef.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
        },
        onPanResponderMove: (event, gesture) => {
          if (!dragId) return;
          const start = dragStartRef.current;
          if (
            start &&
            (Math.abs(event.nativeEvent.pageX - start.x) > MOVE_CANCEL_THRESHOLD ||
              Math.abs(event.nativeEvent.pageY - start.y) > MOVE_CANCEL_THRESHOLD)
          ) {
            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
          }

          setDragPos((current) => {
            const object = objectsRef.current[dragId];
            if (!current || !object) return current;
            return {
              x: object.x + gesture.dx / scale,
              y: object.y + gesture.dy / scale
            };
          });
        },
        onPanResponderRelease: () => {
          if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
          if (dragId && dragPos) void persistPosition(dragId, dragPos.x, dragPos.y);
          setDragId(null);
          setDragPos(null);
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recreated per drag via refs/closures intentionally kept minimal
    [scale, dragId, dragPos]
  );

  const displayObjects = Object.values(objects).map((object) =>
    object.id === dragId && dragPos ? { ...object, ...dragPos } : object
  );

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.assetRow}>
        {assets.map((asset) => (
          <AssetThumbnail
            key={asset.id}
            asset={asset}
            onPress={() => void addObject({ type: asset.category as RoomObjectType, asset_url: asset.asset_url })}
          />
        ))}
      </ScrollView>

      <View
        style={{ width: displayWidth, height: displayHeight, borderRadius: 16, overflow: "hidden" }}
        {...panResponder.panHandlers}
      >
        <Canvas ref={canvasRef} style={{ width: displayWidth, height: displayHeight, backgroundColor: "#fff7f0" }}>
          <Group transform={[{ scale }]}>
            {displayObjects
              .sort((a, b) => a.z_index - b.z_index)
              .map((object) => (
                <RoomObjectShape key={object.id} object={object} />
              ))}
          </Group>
        </Canvas>

        {displayObjects.map((object) => {
          const text =
            typeof object.data?.["text"] === "string" ? (object.data["text"] as string) : "";
          if (!text) return null;
          return (
            <Text
              key={`text-${object.id}`}
              style={[
                styles.objectText,
                {
                  left: object.x * scale + 6,
                  top: object.y * scale + 6,
                  width: object.width * scale - 12
                }
              ]}
              pointerEvents="none"
            >
              {text}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  assetRow: { flexGrow: 0 },
  objectText: { position: "absolute", fontSize: 12, color: "#1f1f1f" }
});
