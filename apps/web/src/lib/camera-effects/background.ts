import type { CameraEffectPlugin, EffectFrameContext } from "./types";

/** Builds (once, reused across frames) the two offscreen canvases needed
 *  to composite "sharp person over a different background": one holds
 *  the mask scaled to output size, one holds the person cutout before
 *  it's drawn on top of the background layer. */
function createCompositor() {
  const maskCanvas = document.createElement("canvas");
  const maskCtx = maskCanvas.getContext("2d")!;
  const cutoutCanvas = document.createElement("canvas");
  const cutoutCtx = cutoutCanvas.getContext("2d")!;

  return function compositePersonOverBackground(
    ctx: EffectFrameContext,
    drawBackground: () => void
  ) {
    const { source, outputCtx, width, height, segmentationMask, segmentationMaskSize } = ctx;
    if (!segmentationMask || !segmentationMaskSize) {
      // No mask yet (model still loading the first frame) — fall back to
      // the plain camera image rather than showing nothing.
      outputCtx.drawImage(source, 0, 0, width, height);
      return;
    }

    maskCanvas.width = width;
    maskCanvas.height = height;
    cutoutCanvas.width = width;
    cutoutCanvas.height = height;

    // Build a small ImageData at the mask's own (usually lower)
    // resolution and let drawImage scale it up below — far cheaper than
    // a manual per-output-pixel loop.
    const { width: maskWidth, height: maskHeight } = segmentationMaskSize;
    const small = document.createElement("canvas");
    small.width = maskWidth;
    small.height = maskHeight;
    const smallCtx = small.getContext("2d")!;
    const imageData = smallCtx.createImageData(maskWidth, maskHeight);
    for (let i = 0; i < segmentationMask.length && i < maskWidth * maskHeight; i++) {
      const isPerson = segmentationMask[i]! > 0;
      imageData.data[i * 4 + 3] = isPerson ? 255 : 0;
    }
    smallCtx.putImageData(imageData, 0, 0);

    maskCtx.clearRect(0, 0, width, height);
    maskCtx.drawImage(small, 0, 0, width, height);

    cutoutCtx.clearRect(0, 0, width, height);
    cutoutCtx.drawImage(source, 0, 0, width, height);
    cutoutCtx.globalCompositeOperation = "destination-in";
    cutoutCtx.drawImage(maskCanvas, 0, 0);
    cutoutCtx.globalCompositeOperation = "source-over";

    drawBackground();
    outputCtx.drawImage(cutoutCanvas, 0, 0);
  };
}

export const backgroundBlurEffect: CameraEffectPlugin = {
  id: "background-blur",
  name: "Blur background",
  category: "background",
  needsSegmentation: true,
  apply: (() => {
    const composite = createCompositor();
    return (ctx: EffectFrameContext) => {
      composite(ctx, () => {
        ctx.outputCtx.filter = "blur(14px)";
        ctx.outputCtx.drawImage(ctx.source, 0, 0, ctx.width, ctx.height);
        ctx.outputCtx.filter = "none";
      });
    };
  })()
};

const REPLACEMENT_BACKGROUNDS: Record<string, string> = {
  sunset: "linear-gradient(180deg, #fbbf24, #f472b6)",
  ocean: "linear-gradient(180deg, #38bdf8, #1e3a8a)",
  forest: "linear-gradient(180deg, #86efac, #14532d)"
};

export function createBackgroundReplaceEffect(backgroundId: string): CameraEffectPlugin {
  const composite = createCompositor();
  return {
    id: `background-replace-${backgroundId}`,
    name: `Background: ${backgroundId}`,
    category: "background",
    needsSegmentation: true,
    apply(ctx) {
      composite(ctx, () => {
        const gradient = ctx.outputCtx.createLinearGradient(0, 0, 0, ctx.height);
        const colors = REPLACEMENT_BACKGROUNDS[backgroundId]?.match(/#[0-9a-f]{6}/gi) ?? ["#888", "#444"];
        gradient.addColorStop(0, colors[0]!);
        gradient.addColorStop(1, colors[1] ?? colors[0]!);
        ctx.outputCtx.fillStyle = gradient;
        ctx.outputCtx.fillRect(0, 0, ctx.width, ctx.height);
      });
    }
  };
}
