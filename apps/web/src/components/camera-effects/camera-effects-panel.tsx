"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ACCESSORY_EFFECTS, BACKGROUND_EFFECTS, FRAME_EFFECTS } from "@/lib/camera-effects/registry";
import { cn } from "@/lib/utils";
import { useCameraPipeline } from "./use-camera-pipeline";

function VideoPreview({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      className="aspect-video w-full max-w-xs rounded-md bg-black object-cover"
    />
  );
}

export function CameraEffectsPanel({
  onPublish
}: {
  /** Called with the processed stream when the user wants it live in the
   *  call (or `null` to go back to the plain camera) — see how
   *  call-controls.tsx wires this into LiveKit publish/unpublish. */
  onPublish: (stream: MediaStream | null) => void;
}) {
  const pipeline = useCameraPipeline();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <VideoPreview stream={pipeline.outputStream ?? pipeline.previewStream} />
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant={pipeline.enabled ? "outline" : "default"}
            onClick={() => {
              if (pipeline.enabled) onPublish(null);
              pipeline.setEnabled(!pipeline.enabled);
            }}
          >
            {pipeline.enabled ? "Turn off effects" : "Turn on effects"}
          </Button>
          {pipeline.enabled ? (
            <Button
              size="sm"
              disabled={pipeline.loading || !pipeline.outputStream}
              onClick={() => onPublish(pipeline.outputStream)}
            >
              {pipeline.loading ? "Loading…" : "Use in call"}
            </Button>
          ) : null}
        </div>
      </div>

      {pipeline.enabled ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Brightness</label>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={pipeline.filterParams.brightness}
              onChange={(e) =>
                pipeline.setFilterParams((p) => ({ ...p, brightness: Number(e.target.value) }))
              }
            />
            <label className="text-xs text-muted-foreground">Contrast</label>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={pipeline.filterParams.contrast}
              onChange={(e) => pipeline.setFilterParams((p) => ({ ...p, contrast: Number(e.target.value) }))}
            />
            <label className="text-xs text-muted-foreground">Saturation</label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={pipeline.filterParams.saturation}
              onChange={(e) =>
                pipeline.setFilterParams((p) => ({ ...p, saturation: Number(e.target.value) }))
              }
            />
            <label className="text-xs text-muted-foreground">Warm / cool</label>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.1}
              value={pipeline.filterParams.warmth}
              onChange={(e) => pipeline.setFilterParams((p) => ({ ...p, warmth: Number(e.target.value) }))}
            />
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={pipeline.filterParams.blackAndWhite}
                onChange={(e) =>
                  pipeline.setFilterParams((p) => ({ ...p, blackAndWhite: e.target.checked }))
                }
              />
              Black & white
            </label>
          </div>

          <EffectPicker
            label="Background"
            options={BACKGROUND_EFFECTS}
            value={pipeline.backgroundEffectId}
            onChange={pipeline.setBackgroundEffectId}
          />
          <EffectPicker
            label="Accessory"
            options={ACCESSORY_EFFECTS}
            value={pipeline.accessoryEffectId}
            onChange={pipeline.setAccessoryEffectId}
          />
          <EffectPicker
            label="Frame"
            options={FRAME_EFFECTS}
            value={pipeline.frameEffectId}
            onChange={pipeline.setFrameEffectId}
          />
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={pipeline.beautyOn}
              onChange={(e) => pipeline.setBeautyOn(e.target.checked)}
            />
            Smoothing
          </label>
        </>
      ) : null}
    </div>
  );
}

function EffectPicker({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: { id: string; name: string }[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className={cn("rounded-full border px-2 py-1 text-xs", value === null && "bg-brand-100 border-brand-500")}
          onClick={() => onChange(null)}
        >
          None
        </button>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={cn(
              "rounded-full border px-2 py-1 text-xs",
              value === option.id && "bg-brand-100 border-brand-500"
            )}
            onClick={() => onChange(option.id)}
          >
            {option.name}
          </button>
        ))}
      </div>
    </div>
  );
}
