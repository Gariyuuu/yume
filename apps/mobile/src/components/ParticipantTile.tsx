import type { TrackReference } from "@livekit/components-react";
import { VideoTrack } from "@livekit/react-native";
import type { Participant } from "livekit-client";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function ParticipantTile({
  participant,
  cameraTrackRef,
  speaking,
  muted,
  isSelf,
  onLongPress
}: {
  participant: Participant;
  cameraTrackRef: TrackReference | undefined;
  speaking: boolean;
  muted: boolean;
  isSelf: boolean;
  onLongPress?: () => void;
}) {
  const initials = (participant.name || participant.identity).slice(0, 2).toUpperCase();

  return (
    <Pressable
      style={styles.tile}
      onLongPress={isSelf ? undefined : onLongPress}
      delayLongPress={400}
      accessibilityLabel={`${participant.name || participant.identity}${muted ? ", muted" : ""}${speaking ? ", speaking" : ""}`}
    >
      {cameraTrackRef ? (
        <VideoTrack
          trackRef={cameraTrackRef}
          style={speaking ? { ...styles.video, ...styles.speakingRing } : styles.video}
          objectFit="cover"
        />
      ) : (
        <View style={[styles.avatar, speaking ? styles.speakingRing : null]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      )}
      <Text style={styles.name} numberOfLines={1}>
        {muted ? "🔇 " : ""}
        {participant.name || participant.identity}
      </Text>
    </Pressable>
  );
}

const SIZE = 96;

const styles = StyleSheet.create({
  tile: {
    width: SIZE,
    alignItems: "center",
    gap: 4
  },
  speakingRing: {
    borderWidth: 3,
    borderColor: "#9f22cd"
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
