"use client";

import type { RoomPresence } from "@yume/room-schema";
import {
  useConnectionState,
  useIsSpeaking,
  useLocalParticipant,
  useRemoteParticipants
} from "@livekit/components-react";
import { ConnectionState, RemoteAudioTrack, Track } from "livekit-client";
import { useEffect } from "react";

const MIN_DISTANCE = 80;
const MAX_DISTANCE = 560;
const FAR_VOLUME = 0.05;

/** Linear falloff: full volume inside MIN_DISTANCE, near-silent past MAX_DISTANCE. */
function distanceVolume(dx: number, dy: number): number {
  const distance = Math.hypot(dx, dy);
  if (distance <= MIN_DISTANCE) return 1;
  if (distance >= MAX_DISTANCE) return FAR_VOLUME;
  const t = (distance - MIN_DISTANCE) / (MAX_DISTANCE - MIN_DISTANCE);
  return 1 - t * (1 - FAR_VOLUME);
}

/**
 * No visual output — runs inside <LiveKitRoom> to (1) mirror local
 * mic/camera/speaking/connection state into the room's presence channel,
 * and (2) apply distance-based spatial audio by setting each remote
 * participant's mic volume via LiveKit's per-track `setVolume` (there is
 * no built-in LiveKit spatial audio feature — see
 * docs/phase-1/07-api-capability-review.md).
 */
export function CallStateSync({
  updateSelf,
  participants,
  selfBubble,
  audioMode
}: {
  updateSelf: (partial: Partial<RoomPresence>) => void;
  participants: Record<string, RoomPresence>;
  selfBubble: { x: number; y: number };
  audioMode: "spatial" | "room_wide";
}) {
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const connectionState = useConnectionState();
  const isSpeaking = useIsSpeaking(localParticipant);

  useEffect(() => {
    updateSelf({
      livekitConnected: connectionState === ConnectionState.Connected,
      muted: !isMicrophoneEnabled,
      cameraOn: isCameraEnabled,
      speaking: isSpeaking
    });
  }, [connectionState, isMicrophoneEnabled, isCameraEnabled, isSpeaking, updateSelf]);

  useEffect(() => {
    for (const participant of remoteParticipants) {
      const track = participant.getTrackPublication(Track.Source.Microphone)?.track;
      if (!(track instanceof RemoteAudioTrack)) continue;

      if (audioMode === "room_wide") {
        track.setVolume(1);
        continue;
      }

      const remoteBubble = participants[participant.identity]?.bubble;
      if (!remoteBubble) continue;

      track.setVolume(
        distanceVolume(remoteBubble.x - selfBubble.x, remoteBubble.y - selfBubble.y)
      );
    }
  }, [remoteParticipants, participants, selfBubble, audioMode]);

  return null;
}
