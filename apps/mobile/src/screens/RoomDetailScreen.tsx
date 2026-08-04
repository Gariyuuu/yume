import type { RoomObject } from "@yume/room-schema";
import { AudioSession, LiveKitRoom } from "@livekit/react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { CallView } from "../components/CallView";
import { fetchLiveKitToken } from "../lib/livekit-token";
import { supabase } from "../lib/supabase";

/**
 * Voice/video (Phase 3) is real here — camera bubbles dragged around a
 * shared canvas are not yet, since that needs the React Native Skia
 * renderer sharing the room-object model with the web Konva canvas
 * (docs/phase-1/02-architecture.md §3), scoped to Phase 4 alongside web's
 * decoration tools. The object list below stays read-only until then,
 * proving the same @yume/room-schema data loads correctly on mobile
 * rather than faking a canvas that isn't there yet.
 */
export function RoomDetailScreen({ roomId, onBack }: { roomId: string; onBack: () => void }) {
  const [roomName, setRoomName] = useState<string | null>(null);
  const [objects, setObjects] = useState<RoomObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [creds, setCreds] = useState<{ token: string; url: string } | null>(null);

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

  // LiveKit RN's documented pattern: an active audio session is required
  // for call audio to route correctly on-device, started only while a
  // call might be joined rather than for the whole app lifetime.
  useEffect(() => {
    void AudioSession.startAudioSession();
    return () => {
      void AudioSession.stopAudioSession();
    };
  }, []);

  async function handleJoin() {
    const result = await fetchLiveKitToken(roomId);
    if (result.status === "ok") {
      setCreds({ token: result.token, url: result.url });
      setJoined(true);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack}>
        <Text style={styles.link}>← Rooms</Text>
      </Pressable>
      <Text style={styles.title}>{roomName ?? "Room"}</Text>

      {joined && creds ? (
        <LiveKitRoom
          serverUrl={creds.url}
          token={creds.token}
          connect
          audio={false}
          video={false}
          onDisconnected={() => setJoined(false)}
        >
          <CallView onLeave={() => setJoined(false)} />
        </LiveKitRoom>
      ) : (
        <Pressable style={styles.joinButton} onPress={handleJoin}>
          <Text style={styles.joinButtonText}>Join call</Text>
        </Pressable>
      )}

      <Text style={styles.notice}>
        The drag-around room canvas ships on iOS in Phase 4. This is a read-only preview
        of what&rsquo;s in the room.
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
  notice: { color: "#888", marginTop: 12 },
  joinButton: {
    marginTop: 12,
    backgroundColor: "#9f22cd",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center"
  },
  joinButtonText: { color: "#fff", fontWeight: "600" },
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
