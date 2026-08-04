"use client";

import type { RoomPresence } from "@yume/room-schema";
import { useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useMemo } from "react";
import { ROOM_HEIGHT, ROOM_WIDTH } from "@/components/room-canvas/room-dimensions";
import { ParticipantBubble } from "./participant-bubble";

/**
 * DOM overlay, not a Konva layer: circular live-video bubbles need a real
 * <video> element (LiveKit's VideoTrack renders one), and compositing
 * video into a canvas cleanly needs a manual per-frame redraw loop that
 * isn't worth the complexity for a fixed-size, non-zooming room canvas —
 * absolute positioning on top of the Stage is simpler and just as
 * correct here. Room decoration (furniture etc.) stays on the Konva layer
 * underneath.
 */
export function ParticipantBubblesLayer({
  participants,
  selfProfileId,
  canManageAll,
  onDragSelf,
  onMuteParticipant
}: {
  participants: Record<string, RoomPresence>;
  selfProfileId: string;
  canManageAll: boolean;
  onDragSelf: (x: number, y: number) => void;
  onMuteParticipant: (profileId: string) => void;
}) {
  const cameraTracks = useTracks([Track.Source.Camera]);
  const trackByIdentity = useMemo(() => {
    const map = new Map<string, (typeof cameraTracks)[number]>();
    for (const trackRef of cameraTracks) {
      map.set(trackRef.participant.identity, trackRef);
    }
    return map;
  }, [cameraTracks]);

  return (
    <div
      className="pointer-events-none absolute left-0 top-0"
      style={{ width: ROOM_WIDTH, height: ROOM_HEIGHT }}
    >
      {Object.values(participants).map((presence) => {
        const isSelf = presence.profileId === selfProfileId;
        return (
          <ParticipantBubble
            key={presence.profileId}
            presence={presence}
            trackRef={trackByIdentity.get(presence.profileId)}
            isSelf={isSelf}
            canModerate={canManageAll && !isSelf}
            onDragEnd={isSelf ? onDragSelf : undefined}
            onMute={() => onMuteParticipant(presence.profileId)}
          />
        );
      })}
    </div>
  );
}
