import type { RoomObject } from "@yume/room-schema";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";

/**
 * Deliberately a read-only list, not a canvas: the brief calls for a React
 * Native Skia renderer sharing the room-object model with the web Konva
 * canvas (docs/phase-1/02-architecture.md §3), which is real UI work
 * scoped to Phase 4 (decoration tools land on both platforms together).
 * This screen proves the same @yume/room-schema data loads correctly on
 * mobile ahead of that, rather than faking a canvas that isn't there yet.
 */
export function RoomDetailScreen({ roomId, onBack }: { roomId: string; onBack: () => void }) {
  const [roomName, setRoomName] = useState<string | null>(null);
  const [objects, setObjects] = useState<RoomObject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [{ data: room }, { data: roomObjects }] = await Promise.all([
        supabase.from("rooms").select("name").eq("id", roomId).maybeSingle(),
        supabase.from("room_objects").select("*").eq("room_id", roomId)
      ]);

      if (cancelled) return;
      setRoomName(room?.name ?? null);
      setObjects((roomObjects ?? []) as RoomObject[]);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack}>
        <Text style={styles.link}>← Rooms</Text>
      </Pressable>
      <Text style={styles.title}>{roomName ?? "Room"}</Text>
      <Text style={styles.notice}>
        The interactive room canvas ships on iOS in Phase 4, alongside web decoration
        tools. This is a read-only preview of what's in the room.
      </Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={objects}
          keyExtractor={(object) => object.id}
          contentContainerStyle={{ gap: 8, paddingTop: 12 }}
          ListEmptyComponent={<Text style={styles.empty}>Nothing placed in this room yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.objectRow}>
              <Text style={styles.objectType}>{item.type}</Text>
              <Text style={styles.objectPos}>
                ({Math.round(item.x)}, {Math.round(item.y)})
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff7f0" },
  link: { color: "#6b1988", marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "600" },
  notice: { color: "#888", marginTop: 8 },
  objectRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  objectType: { textTransform: "capitalize", fontWeight: "600" },
  objectPos: { color: "#888" },
  empty: { textAlign: "center", color: "#888", marginTop: 24 }
});
