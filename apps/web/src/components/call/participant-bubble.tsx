"use client";

import type { RoomPresence } from "@yume/room-schema";
import type { TrackReference } from "@livekit/components-react";
import { VideoTrack } from "@livekit/components-react";
import { MicOff } from "lucide-react";
import { useRef, useState } from "react";
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
  onDragEnd,
  onMute
}: {
  presence: RoomPresence;
  trackRef: TrackReference | undefined;
  isSelf: boolean;
  canModerate: boolean;
  onDragEnd?: (x: number, y: number) => void;
  onMute?: () => void;
}) {
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
          "relative h-full w-full cursor-grab overflow-hidden rounded-bubble border-2 bg-muted shadow-md active:cursor-grabbing",
          presence.speaking ? "border-brand-500" : "border-white"
        )}
        onClick={() => canModerate && setMenuOpen((open) => !open)}
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

        <span
          className={cn(
            "absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white",
            STATUS_COLOR[presence.status]
          )}
        />

        {presence.muted ? (
          <span className="absolute bottom-0 right-0 rounded-full bg-black/70 p-1">
            <MicOff className="h-3 w-3 text-white" />
          </span>
        ) : null}
      </button>

      <span className="mt-1 max-w-[90px] truncate rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
        {presence.displayName}
      </span>

      {menuOpen ? (
        <div className="absolute top-full z-10 mt-1 rounded-md border bg-popover p-1 shadow-md">
          <button
            type="button"
            className="whitespace-nowrap rounded px-2 py-1 text-xs hover:bg-muted"
            onClick={() => {
              setMenuOpen(false);
              onMute?.();
            }}
          >
            Mute microphone
          </button>
        </div>
      ) : null}
    </div>
  );
}
