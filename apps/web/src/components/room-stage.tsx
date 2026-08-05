"use client";

import type { RoomAsset, RoomObject } from "@yume/room-schema";
import type Konva from "konva";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { banParticipantAction, kickParticipantAction, muteParticipantAction } from "@/app/room/[roomId]/livekit-actions";
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
import { SnapshotDialog } from "@/components/room-canvas/snapshot-dialog";
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
  const stageRef = useRef<Konva.Stage | null>(null);
  const bubblesContainerRef = useRef<HTMLDivElement | null>(null);

  async function handleMuteParticipant(targetProfileId: string) {
    const result = await muteParticipantAction(roomId, targetProfileId);
    if (result.error) toast.error(result.error);
  }

  async function handleKickParticipant(targetProfileId: string) {
    if (!window.confirm("Remove this person from the room? They can rejoin with a valid invite.")) return;
    const result = await kickParticipantAction(roomId, targetProfileId);
    if (result.error) toast.error(result.error);
    else toast.success("Removed from the room.");
  }

  async function handleBanParticipant(targetProfileId: string) {
    if (!window.confirm("Ban this person from the room? They won't be able to rejoin.")) return;
    const result = await banParticipantAction(roomId, targetProfileId);
    if (result.error) toast.error(result.error);
    else toast.success("Banned from the room.");
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
          <SnapshotDialog stageRef={stageRef} bubblesContainerRef={bubblesContainerRef} participants={participants} />
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
          onStageRef={(stage) => {
            stageRef.current = stage;
          }}
          overlay={
            <>
              <ParticipantBubblesLayer
                participants={participants}
                selfProfileId={profile.id}
                roomId={roomId}
                canManageAll={canManageAll}
                onDragSelf={(x, y) => updateSelf({ bubble: { x, y } })}
                onMuteParticipant={handleMuteParticipant}
                onKickParticipant={handleKickParticipant}
                onBanParticipant={handleBanParticipant}
                containerRef={bubblesContainerRef}
              />
              <DrawingCanvasLoader drawing={drawing} />
            </>
          }
        />
      </div>
    </RoomCallProvider>
  );
}
