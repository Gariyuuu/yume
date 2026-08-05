import { AudioSession, LiveKitRoom } from "@livekit/react-native";
import type { useCanvasRef } from "@shopify/react-native-skia";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { CallView } from "../components/CallView";
import { ChatModal } from "../components/ChatModal";
import { GamesModal } from "../components/GamesModal";
import { RoomCanvasView } from "../components/RoomCanvasView";
import { fetchLiveKitToken } from "../lib/livekit-token";
import { shareRoomSnapshot } from "../lib/snapshot";
import { supabase } from "../lib/supabase";

/**
 * Phase 5 mobile scope is chat only — YouTube/Spotify/timers/study mode
 * stay web-only for now (real subsystems, not stubs, just not ported
 * here yet). Matches the "thinner mobile slice, clearly documented"
 * pattern from every prior phase. Phase 6 adds Tic-Tac-Toe (see
 * GamesModal.tsx's header comment for why it's the only game on mobile,
 * and camera effects stay web-only — no on-device Vision/Core Image
 * pipeline built for RN yet).
 */

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
  const [chatOpen, setChatOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const canvasRefRef = useRef<ReturnType<typeof useCanvasRef> | null>(null);

  async function handleSnapshot() {
    if (!canvasRefRef.current) return;
    const result = await shareRoomSnapshot(canvasRefRef.current);
    if (result.error) Alert.alert("Couldn't share snapshot", result.error);
  }

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
      <View style={styles.topRow}>
        <Pressable onPress={onBack}>
          <Text style={styles.link}>← Rooms</Text>
        </Pressable>
        <Pressable onPress={() => setChatOpen(true)}>
          <Text style={styles.link}>Chat</Text>
        </Pressable>
        <Pressable onPress={() => setGamesOpen(true)}>
          <Text style={styles.link}>Games</Text>
        </Pressable>
        <Pressable onPress={() => void handleSnapshot()}>
          <Text style={styles.link}>Snapshot</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>{roomName ?? "Room"}</Text>

      <ChatModal
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        roomId={roomId}
        currentProfileId={currentProfileId}
        canManageAll={canManageAll}
      />
      <GamesModal
        visible={gamesOpen}
        onClose={() => setGamesOpen(false)}
        roomId={roomId}
        currentProfileId={currentProfileId}
      />

      {joined && creds ? (
        <LiveKitRoom
          serverUrl={creds.url}
          token={creds.token}
          connect
          audio={false}
          video={false}
          onDisconnected={() => setJoined(false)}
        >
          <CallView
            roomId={roomId}
            currentProfileId={currentProfileId}
            canManageAll={canManageAll}
            onLeave={() => setJoined(false)}
          />
        </LiveKitRoom>
      ) : (
        <Pressable style={styles.joinButton} onPress={handleJoin}>
          <Text style={styles.joinButtonText}>Join call</Text>
        </Pressable>
      )}

      <View style={styles.canvasWrap}>
        <RoomCanvasView
          roomId={roomId}
          currentProfileId={currentProfileId}
          canManageAll={canManageAll}
          onCanvasRef={(ref) => {
            canvasRefRef.current = ref;
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff7f0" },
  topRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  link: { color: "#6b1988" },
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
