import type { TrackReference } from "@livekit/components-react";
import { VideoTrack } from "@livekit/react-native";
import type { Participant } from "livekit-client";
import { StyleSheet, Text, View } from "react-native";

export function ParticipantTile({
  participant,
  cameraTrackRef,
  speaking,
  muted
}: {
  participant: Participant;
  cameraTrackRef: TrackReference | undefined;
  speaking: boolean;
  muted: boolean;
}) {
  const initials = (participant.name || participant.identity).slice(0, 2).toUpperCase();

  return (
    <View style={[styles.tile, speaking ? styles.speaking : null]}>
      {cameraTrackRef ? (
        <VideoTrack trackRef={cameraTrackRef} style={styles.video} objectFit="cover" />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      )}
      <Text style={styles.name} numberOfLines={1}>
        {muted ? "🔇 " : ""}
        {participant.name || participant.identity}
      </Text>
    </View>
  );
}

const SIZE = 96;

const styles = StyleSheet.create({
  tile: {
    width: SIZE,
    alignItems: "center",
    gap: 4
  },
  speaking: {
    opacity: 1
  },
  video: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: "#000"
  },
  avatar: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: "#e9d5ff",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: { fontWeight: "600", color: "#6b1988" },
  name: { fontSize: 12, color: "#333", maxWidth: SIZE }
});
