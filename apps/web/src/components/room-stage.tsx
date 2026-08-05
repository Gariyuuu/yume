"use client";

import type { RoomAsset, RoomObject } from "@yume/room-schema";
import { useState } from "react";
import { toast } from "sonner";
import { muteParticipantAction } from "@/app/room/[roomId]/livekit-actions";
import { updateOwnStatusAction } from "@/app/room/[roomId]/actions";
import { CallControls } from "@/components/call/call-controls";
import { CallStateSync } from "@/components/call/call-state-sync";
import { ParticipantBubblesLayer } from "@/components/call/participant-bubbles-layer";
import { RoomCallProvider } from "@/components/call/room-call-provider";
import { ScreenShareStrip } from "@/components/call/screen-share-strip";
import { AssetPicker } from "@/components/decoration/asset-picker";
import { DrawingCanvasLoader } from "@/components/drawing/drawing-canvas-loader";
import { DrawingToolbar } from "@/components/drawing/drawing-toolbar";
import { useDrawingLayer } from "@/components/drawing/use-drawing-layer";
import type { PendingAsset } from "@/components/room-canvas/room-canvas";
import { RoomCanvasLoader } from "@/components/room-canvas/room-canvas-loader";
import { StudyDialog } from "@/components/study/study-dialog";
import { useRoomPresence } from "@/lib/presence/use-room-presence";

export function RoomStage({
  roomId,
  initialObjects,
  assets,
  profile,
  canManageAll,
  audioMode
}: {
  roomId: string;
  initialObjects: RoomObject[];
  assets: RoomAsset[];
  profile: { id: string; display_name: string; avatar_url: string | null };
  canManageAll: boolean;
  audioMode: "spatial" | "room_wide";
}) {
  const { participants, self, updateSelf } = useRoomPresence(roomId, {
    profileId: profile.id,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url
  });
  const [pendingAsset, setPendingAsset] = useState<PendingAsset | null>(null);
  const drawing = useDrawingLayer(roomId, profile.id, canManageAll);

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

        <div className="flex flex-wrap gap-3">
          <AssetPicker
            assets={assets}
            pendingAsset={pendingAsset}
            onSelect={setPendingAsset}
            onCancel={() => setPendingAsset(null)}
          />
          <DrawingToolbar drawing={drawing} canManageAll={canManageAll} />
          <StudyDialog
            roomId={roomId}
            currentProfileId={profile.id}
            isStudying={self.status === "studying"}
            doNotDisturb={self.doNotDisturb}
            onStudyingChange={(studying) => {
              const status = studying ? "studying" : "online";
              updateSelf({ status });
              void updateOwnStatusAction(status);
            }}
            onDoNotDisturbChange={(dnd) => updateSelf({ doNotDisturb: dnd })}
          />
        </div>

        <RoomCanvasLoader
          roomId={roomId}
          initialObjects={initialObjects}
          currentProfileId={profile.id}
          canManageAll={canManageAll}
          pendingAsset={pendingAsset}
          onAssetPlaced={() => setPendingAsset(null)}
          overlay={
            <>
              <ParticipantBubblesLayer
                participants={participants}
                selfProfileId={profile.id}
                canManageAll={canManageAll}
                onDragSelf={(x, y) => updateSelf({ bubble: { x, y } })}
                onMuteParticipant={handleMuteParticipant}
              />
              <DrawingCanvasLoader drawing={drawing} />
            </>
          }
        />
      </div>
    </RoomCallProvider>
  );
}
