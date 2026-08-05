import { AudioSession, LiveKitRoom } from "@livekit/react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CallView } from "../components/CallView";
import { RoomCanvasView } from "../components/RoomCanvasView";
import { fetchLiveKitToken } from "../lib/livekit-token";
import { supabase } from "../lib/supabase";

export function RoomDetailScreen({
  roomId,
  currentProfileId,
  onBack
}: {
  roomId: string;
  currentProfileId: string;
  onBack: () => void;
}) {
  const [roomName, setRoomName] = useState<string | null>(null);
  const [canManageAll, setCanManageAll] = useState(false);
  const [joined, setJoined] = useState(false);
  const [creds, setCreds] = useState<{ token: string; url: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [{ data: room }, { data: membership }] = await Promise.all([
        supabase.from("rooms").select("name").eq("id", roomId).maybeSingle(),
        supabase
          .from("room_memberships")
          .select("role")
          .eq("room_id", roomId)
          .eq("profile_id", currentProfileId)
          .maybeSingle()
      ]);

      if (cancelled) return;
      setRoomName(room?.name ?? null);
      setCanManageAll(membership?.role === "owner" || membership?.role === "moderator");
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [roomId, currentProfileId]);

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

      <View style={styles.canvasWrap}>
        <RoomCanvasView roomId={roomId} currentProfileId={currentProfileId} canManageAll={canManageAll} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff7f0" },
  link: { color: "#6b1988", marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "600" },
  canvasWrap: { marginTop: 16, flex: 1 },
  joinButton: {
    marginTop: 12,
    backgroundColor: "#9f22cd",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center"
  },
  joinButtonText: { color: "#fff", fontWeight: "600" }
});
