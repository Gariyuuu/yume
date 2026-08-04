"use client";

import type { RoomObject } from "@yume/room-schema";
import { toast } from "sonner";
import { muteParticipantAction } from "@/app/room/[roomId]/livekit-actions";
import { CallControls } from "@/components/call/call-controls";
import { CallStateSync } from "@/components/call/call-state-sync";
import { ParticipantBubblesLayer } from "@/components/call/participant-bubbles-layer";
import { RoomCallProvider } from "@/components/call/room-call-provider";
import { ScreenShareStrip } from "@/components/call/screen-share-strip";
import { RoomCanvasLoader } from "@/components/room-canvas/room-canvas-loader";
import { useRoomPresence } from "@/lib/presence/use-room-presence";

export function RoomStage({
  roomId,
  initialObjects,
  profile,
  canManageAll,
  audioMode
}: {
  roomId: string;
  initialObjects: RoomObject[];
  profile: { id: string; display_name: string; avatar_url: string | null };
  canManageAll: boolean;
  audioMode: "spatial" | "room_wide";
}) {
  const { participants, self, updateSelf } = useRoomPresence(roomId, {
    profileId: profile.id,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url
  });

  async function handleMuteParticipant(targetProfileId: string) {
    const result = await muteParticipantAction(roomId, targetProfileId);
    if (result.error) toast.error(result.error);
  }

  return (
    <RoomCallProvider roomId={roomId}>
      <div className="flex flex-col gap-3">
        <CallControls
          roomId={roomId}
          audioMode={audioMode}
          isHost={canManageAll}
          onStatusChange={(status) => updateSelf({ status })}
        />
        <ScreenShareStrip />
        <CallStateSync
          updateSelf={updateSelf}
          participants={participants}
          selfBubble={self.bubble}
          audioMode={audioMode}
        />
        <RoomCanvasLoader
          roomId={roomId}
          initialObjects={initialObjects}
          currentProfileId={profile.id}
          canManageAll={canManageAll}
          overlay={
            <ParticipantBubblesLayer
              participants={participants}
              selfProfileId={profile.id}
              canManageAll={canManageAll}
              onDragSelf={(x, y) => updateSelf({ bubble: { x, y } })}
              onMuteParticipant={handleMuteParticipant}
            />
          }
        />
      </div>
    </RoomCallProvider>
  );
}
