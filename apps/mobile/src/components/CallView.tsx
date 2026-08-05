import {
  useConnectionState,
  useIsSpeaking,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks
} from "@livekit/react-native";
// Not re-exported by @livekit/react-native's curated hook barrel, but this
// hook is DOM-free (just calls localParticipant.set*Enabled through room
// context), so it works fine pulled straight from components-react.
import { useTrackToggle } from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ParticipantMenu } from "./ParticipantMenu";
import { ParticipantTile } from "./ParticipantTile";

export function CallView({
  roomId,
  currentProfileId,
  canManageAll,
  onLeave
}: {
  roomId: string;
  currentProfileId: string;
  canManageAll: boolean;
  onLeave: () => void;
}) {
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const connectionState = useConnectionState();
  const isSpeaking = useIsSpeaking(localParticipant);
  const cameraTracks = useTracks([Track.Source.Camera]);
  const [menuTarget, setMenuTarget] = useState<{ profileId: string; name: string } | null>(null);

  const mic = useTrackToggle({ source: Track.Source.Microphone });
  const camera = useTrackToggle({ source: Track.Source.Camera });

  const trackByIdentity = useMemo(() => {
    const map = new Map<string, (typeof cameraTracks)[number]>();
    for (const trackRef of cameraTracks) map.set(trackRef.participant.identity, trackRef);
    return map;
  }, [cameraTracks]);

  if (connectionState !== ConnectionState.Connected) {
    return (
      <View style={styles.connecting}>
        <ActivityIndicator />
        <Text style={styles.connectingText}>Connecting…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal contentContainerStyle={styles.tiles} showsHorizontalScrollIndicator={false}>
        <ParticipantTile
          participant={localParticipant}
          cameraTrackRef={trackByIdentity.get(localParticipant.identity)}
          speaking={isSpeaking}
          muted={!isMicrophoneEnabled}
          isSelf
        />
        {remoteParticipants.map((participant) => (
          <ParticipantTile
            key={participant.identity}
            participant={participant}
            cameraTrackRef={trackByIdentity.get(participant.identity)}
            speaking={participant.isSpeaking}
            muted={!participant.isMicrophoneEnabled}
            isSelf={false}
            onLongPress={() =>
              setMenuTarget({ profileId: participant.identity, name: participant.name || participant.identity })
            }
          />
        ))}
      </ScrollView>

      {menuTarget ? (
        <ParticipantMenu
          visible
          onClose={() => setMenuTarget(null)}
          roomId={roomId}
          currentProfileId={currentProfileId}
          targetProfileId={menuTarget.profileId}
          targetName={menuTarget.name}
          canModerate={canManageAll}
        />
      ) : null}

      <View style={styles.controls}>
        <Pressable
          style={[styles.button, isMicrophoneEnabled ? styles.buttonOn : styles.buttonOff]}
          onPress={() => mic.toggle()}
        >
          <Text style={styles.buttonText}>{isMicrophoneEnabled ? "Mute" : "Unmute"}</Text>
        </Pressable>
        <Pressable
          style={[styles.button, isCameraEnabled ? styles.buttonOn : styles.buttonOff]}
          onPress={() => camera.toggle()}
        >
          <Text style={styles.buttonText}>{isCameraEnabled ? "Camera off" : "Camera on"}</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.buttonLeave]} onPress={onLeave}>
          <Text style={styles.buttonText}>Leave</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  connecting: { alignItems: "center", padding: 24, gap: 8 },
  connectingText: { color: "#888" },
  tiles: { gap: 12, paddingVertical: 4 },
  controls: { flexDirection: "row", gap: 8 },
  button: { flex: 1, borderRadius: 999, paddingVertical: 10, alignItems: "center" },
  buttonOn: { backgroundColor: "#9f22cd" },
  buttonOff: { backgroundColor: "#ddd" },
  buttonLeave: { backgroundColor: "#dc2626" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 13 }
});
