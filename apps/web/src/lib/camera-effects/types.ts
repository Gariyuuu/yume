/**
 * The plugin interface the brief asks for ("Build an effect-plugin
 * interface so more lenses can be added later" —
 * docs/phase-1/11-implementation-checklist.md Phase 6). A new effect is a
 * new entry in registry.ts implementing this; the render pipeline
 * (use-camera-pipeline.ts) never changes.
 *
 * Render passes run in a fixed order (background → beauty → accessory →
 * frame) because compositing genuinely requires it — background has to
 * be drawn before the sharp foreground cutout, frames have to be drawn
 * last so they sit on top. This is normal for real-time video effect
 * pipelines (Snap's Lens Studio and similar tools have the same kind of
 * fixed passes); it doesn't limit what a *new effect within a category*
 * can do.
 */
export type EffectCategory = "background" | "beauty" | "accessory" | "frame";

export interface EffectFrameContext {
  /** The raw camera <video> element — always the true source pixels. */
  source: HTMLVideoElement;
  /** Shared output canvas context; plugins draw onto this in place. */
  outputCtx: CanvasRenderingContext2D;
  width: number;
  height: number;
  /** Normalized (0-1) landmarks for the first detected face, if any and
   *  if some active plugin declared `needsFaceLandmarks`. */
  faceLandmarks: { x: number; y: number; z: number }[] | null;
  /** Per-pixel person(1)/background(0) mask, if any and if some active
   *  plugin declared `needsSegmentation`. The mask's own resolution
   *  rarely matches the video's — see `segmentationMaskSize`. */
  segmentationMask: Uint8Array | null;
  segmentationMaskSize: { width: number; height: number } | null;
  params: Record<string, number>;
}

export interface CameraEffectPlugin {
  id: string;
  name: string;
  category: EffectCategory;
  needsFaceLandmarks?: boolean;
  needsSegmentation?: boolean;
  apply(ctx: EffectFrameContext): void;
}

export interface FilterParams {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  blackAndWhite: boolean;
}

export const DEFAULT_FILTER_PARAMS: FilterParams = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  warmth: 0,
  blackAndWhite: false
};

/** Canvas 2D `filter` mirrors CSS filter functions — this is the one
 *  "filter" step that isn't modeled as a discrete plugin, since
 *  brightness/contrast/saturation/warmth/B&W all combine into a single
 *  filter string applied once per frame rather than five separate
 *  full-frame redraws. */
export function buildFilterString(params: FilterParams): string {
  const parts = [
    `brightness(${params.brightness})`,
    `contrast(${params.contrast})`,
    `saturate(${params.blackAndWhite ? 0 : params.saturation})`
  ];
  if (params.warmth !== 0) {
    parts.push(`sepia(${Math.min(1, Math.abs(params.warmth))})`);
    parts.push(`hue-rotate(${params.warmth > 0 ? -20 : 160}deg)`);
  }
  return parts.join(" ");
}
