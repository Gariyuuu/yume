"use client";

import type { RoomPresence } from "@yume/room-schema";
import type Konva from "konva";
import { Camera } from "lucide-react";
import { useState } from "react";
import { BUBBLE_SIZE } from "@/components/call/participant-bubble";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ROOM_HEIGHT, ROOM_WIDTH } from "./room-dimensions";

type Aspect = "original" | "square" | "vertical";

/** sx/sy/sw/sh describe a centered crop rectangle in room-canvas
 *  coordinate space (ROOM_WIDTH x ROOM_HEIGHT) for the requested aspect. */
function cropRectFor(aspect: Aspect) {
  if (aspect === "square") {
    const side = Math.min(ROOM_WIDTH, ROOM_HEIGHT);
    return { sx: (ROOM_WIDTH - side) / 2, sy: 0, sw: side, sh: side };
  }
  if (aspect === "vertical") {
    const sh = ROOM_HEIGHT;
    const sw = (sh * 9) / 16;
    return { sx: (ROOM_WIDTH - sw) / 2, sy: 0, sw, sh };
  }
  return { sx: 0, sy: 0, sw: ROOM_WIDTH, sh: ROOM_HEIGHT };
}

/**
 * Captures the Konva decoration stage (no chrome/controls — those are
 * plain React UI outside the Stage, never part of it) plus, optionally,
 * live camera frames composited in at each visible bubble's position.
 * Controls are hidden by construction: `stage.toDataURL()` only ever
 * rasterizes the Layer contents. Camera frames are drawn straight from
 * each participant's rendered <video> element via canvas
 * `drawImage(videoEl, ...)` — a standard Canvas 2D capability, not a
 * LiveKit API — see ParticipantBubble's `data-profile-id` attribute,
 * which is how the video elements get found here.
 */
export function SnapshotDialog({
  stageRef,
  bubblesContainerRef,
  participants
}: {
  stageRef: React.RefObject<Konva.Stage | null>;
  bubblesContainerRef: React.RefObject<HTMLDivElement | null>;
  participants: Record<string, RoomPresence>;
}) {
  const [open, setOpen] = useState(false);
  const [includeCamera, setIncludeCamera] = useState(false);
  const [aspect, setAspect] = useState<Aspect>("original");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function generate() {
    const stage = stageRef.current;
    if (!stage) return;
    setGenerating(true);

    const stageDataUrl = stage.toDataURL({ pixelRatio: 2 });
    const stageImg = new Image();
    await new Promise<void>((resolve) => {
      stageImg.onload = () => resolve();
      stageImg.src = stageDataUrl;
    });
    const imgScale = stageImg.naturalWidth / ROOM_WIDTH;

    const { sx, sy, sw, sh } = cropRectFor(aspect);
    const outputScale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = sw * outputScale;
    canvas.height = sh * outputScale;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
      stageImg,
      sx * imgScale,
      sy * imgScale,
      sw * imgScale,
      sh * imgScale,
      0,
      0,
      canvas.width,
      canvas.height
    );

    if (includeCamera && bubblesContainerRef.current) {
      for (const presence of Object.values(participants)) {
        if (!presence.cameraOn) continue;
        const videoEl = bubblesContainerRef.current.querySelector<HTMLVideoElement>(
          `[data-profile-id="${presence.profileId}"] video`
        );
        if (!videoEl || videoEl.readyState < 2) continue;

        const outX = (presence.bubble.x - sx) * outputScale;
        const outY = (presence.bubble.y - sy) * outputScale;
        const radius = (BUBBLE_SIZE / 2) * outputScale;
        if (outX + radius < 0 || outX - radius > canvas.width || outY + radius < 0 || outY - radius > canvas.height) {
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(outX, outY, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(videoEl, outX - radius, outY - radius, radius * 2, radius * 2);
        ctx.restore();
      }
    }

    setPreviewUrl(canvas.toDataURL("image/png"));
    setGenerating(false);
  }

  async function share() {
    if (!previewUrl) return;
    const blob = await (await fetch(previewUrl)).blob();
    const file = new File([blob], "yume-room.png", { type: "image/png" });

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "My Yume room" });
      return;
    }

    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = "yume-room.png";
    link.click();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setPreviewUrl(null);
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="icon" title="Snapshot" />}>
        <Camera className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Room snapshot</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5">
            {(["original", "square", "vertical"] as const).map((a) => (
              <Button key={a} size="sm" variant={aspect === a ? "default" : "outline"} onClick={() => setAspect(a)}>
                {a === "original" ? "Original" : a === "square" ? "Square" : "Vertical"}
              </Button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeCamera} onChange={(e) => setIncludeCamera(e.target.checked)} />
            Include camera bubbles
          </label>

          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- locally generated data URL, not a static asset
            <img src={previewUrl} alt="Room snapshot preview" className="rounded-md border" />
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={generating} onClick={() => void generate()}>
            {generating ? "Generating…" : "Generate preview"}
          </Button>
          {previewUrl ? <Button onClick={() => void share()}>Share / Save</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
