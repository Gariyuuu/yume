"use client";

import type { RoomPresence } from "@yume/room-schema";
import type { TrackReference } from "@livekit/components-react";
import { VideoTrack } from "@livekit/components-react";
import { MicOff } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { blockUserAction } from "@/app/room/[roomId]/moderation-actions";
import { ReportDialog } from "@/components/moderation/report-dialog";
import { cn } from "@/lib/utils";

export const BUBBLE_SIZE = 76;

const STATUS_COLOR: Record<RoomPresence["status"], string> = {
  online: "bg-emerald-400",
  away: "bg-amber-400",
  busy: "bg-rose-500",
  studying: "bg-violet-500",
  offline: "bg-zinc-400"
};

export function ParticipantBubble({
  presence,
  trackRef,
  isSelf,
  canModerate,
  roomId,
  onDragEnd,
  onMute,
  onKick,
  onBan
}: {
  presence: RoomPresence;
  trackRef: TrackReference | undefined;
  isSelf: boolean;
  canModerate: boolean;
  roomId: string;
  onDragEnd?: (x: number, y: number) => void;
  onMute?: () => void;
  onKick?: () => void;
  onBan?: () => void;
}) {
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const position = dragPos ?? presence.bubble;

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!isSelf || !onDragEnd) return;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const container = event.currentTarget.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setDragPos({
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top))
    });
  }

  function handlePointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragPos) onDragEnd?.(dragPos.x, dragPos.y);
  }

  const initials = presence.displayName.slice(0, 2).toUpperCase();

  return (
    <div
      className="pointer-events-auto absolute flex flex-col items-center"
      data-profile-id={presence.profileId}
      style={{
        left: position.x,
        top: position.y,
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
        transform: "translate(-50%, -50%)",
        touchAction: "none"
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <button
        type="button"
        className={cn(
          "relative h-full w-full cursor-grab overflow-hidden rounded-bubble bg-muted shadow-md active:cursor-grabbing",
          // Speaking is shown with both a color change AND a thicker
          // border (shape, not just color) so it reads for color-blind
          // users too — see docs/phase-1/11-implementation-checklist.md's
          // accessibility item on non-color-only indicators.
          presence.speaking ? "border-4 border-brand-500" : "border-2 border-white"
        )}
        onClick={() => !isSelf && setMenuOpen((open) => !open)}
        aria-label={isSelf ? presence.displayName : `${presence.displayName} — open participant menu`}
      >
        {presence.cameraOn && trackRef ? (
          <VideoTrack trackRef={trackRef} className="h-full w-full object-cover" />
        ) : presence.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatars are arbitrary user-supplied URLs, not build-time assets
          <img src={presence.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-200 text-sm font-semibold text-brand-800">
            {initials}
          </div>
        )}

        {presence.speaking ? <span className="sr-only">Speaking</span> : null}

        <span
          className={cn(
            "absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white",
            STATUS_COLOR[presence.status]
          )}
        >
          <span className="sr-only">{presence.status}</span>
        </span>

        {presence.muted ? (
          <span className="absolute bottom-0 right-0 rounded-full bg-black/70 p-1">
            <MicOff className="h-3 w-3 text-white" aria-hidden="true" />
            <span className="sr-only">Microphone muted</span>
          </span>
        ) : null}
      </button>

      <span className="mt-1 max-w-[90px] truncate rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
        {presence.displayName}
      </span>

      {menuOpen && !isSelf ? (
        <div className="absolute top-full z-10 mt-1 flex flex-col rounded-md border bg-popover p-1 shadow-md">
          {canModerate ? (
            <>
              <button
                type="button"
                className="whitespace-nowrap rounded px-2 py-1 text-left text-xs hover:bg-muted"
                onClick={() => {
                  setMenuOpen(false);
                  onMute?.();
                }}
              >
                Mute microphone
              </button>
              <button
                type="button"
                className="whitespace-nowrap rounded px-2 py-1 text-left text-xs hover:bg-muted"
                onClick={() => {
                  setMenuOpen(false);
                  onKick?.();
                }}
              >
                Kick from room
              </button>
              <button
                type="button"
                className="whitespace-nowrap rounded px-2 py-1 text-left text-xs text-destructive hover:bg-muted"
                onClick={() => {
                  setMenuOpen(false);
                  onBan?.();
                }}
              >
                Ban from room
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="whitespace-nowrap rounded px-2 py-1 text-left text-xs hover:bg-muted"
            onClick={() => {
              setMenuOpen(false);
              void blockUserAction(presence.profileId).then((result) => {
                if (result.error) toast.error(result.error);
                else toast.success(`Blocked ${presence.displayName}.`);
              });
            }}
          >
            Block
          </button>
          <button
            type="button"
            className="whitespace-nowrap rounded px-2 py-1 text-left text-xs hover:bg-muted"
            onClick={() => {
              setMenuOpen(false);
              setReportOpen(true);
            }}
          >
            Report
          </button>
        </div>
      ) : null}

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        roomId={roomId}
        targetProfileId={presence.profileId}
        targetLabel={presence.displayName}
      />
    </div>
  );
}
