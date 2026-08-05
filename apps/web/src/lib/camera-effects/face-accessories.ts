import type { CameraEffectPlugin, EffectFrameContext } from "./types";

/**
 * Landmark indices are from MediaPipe FaceMesh's standard 478-point
 * topology (33/263 = outer eye corners, 10 = forehead top, 234/454 =
 * face edges near the ears) — stable and widely used, but positioning
 * hasn't been visually tuned against a live camera in this environment
 * (no browser available here — see the final Phase 6 report). Treat as a
 * reasonable first pass, not pixel-perfect.
 */
function facePoints(ctx: EffectFrameContext) {
  const lm = ctx.faceLandmarks;
  if (!lm || lm.length < 468) return null;
  const p = (i: number) => ({ x: lm[i]!.x * ctx.width, y: lm[i]!.y * ctx.height });
  return {
    rightEye: p(33),
    leftEye: p(263),
    foreheadTop: p(10),
    chin: p(152),
    rightEdge: p(234),
    leftEdge: p(454)
  };
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export const glassesAccessory: CameraEffectPlugin = {
  id: "accessory-glasses",
  name: "Round glasses",
  category: "accessory",
  needsFaceLandmarks: true,
  apply(ctx) {
    const points = facePoints(ctx);
    if (!points) return;
    const { rightEye, leftEye } = points;
    const centerX = (rightEye.x + leftEye.x) / 2;
    const centerY = (rightEye.y + leftEye.y) / 2;
    const eyeDist = dist(rightEye, leftEye);
    const lensRadius = eyeDist * 0.32;

    const g = ctx.outputCtx;
    g.save();
    g.strokeStyle = "#1f1f1f";
    g.lineWidth = Math.max(2, eyeDist * 0.05);
    g.beginPath();
    g.arc(rightEye.x, centerY, lensRadius, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(leftEye.x, centerY, lensRadius, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.moveTo(rightEye.x + lensRadius, centerY);
    g.lineTo(leftEye.x - lensRadius, centerY);
    g.stroke();
    g.restore();
    void centerX;
  }
};

export const partyHatAccessory: CameraEffectPlugin = {
  id: "accessory-party-hat",
  name: "Party hat",
  category: "accessory",
  needsFaceLandmarks: true,
  apply(ctx) {
    const points = facePoints(ctx);
    if (!points) return;
    const { foreheadTop, rightEdge, leftEdge } = points;
    const faceWidth = dist(rightEdge, leftEdge);
    const hatHeight = faceWidth * 1.1;

    const g = ctx.outputCtx;
    g.save();
    g.fillStyle = "#bb3af0";
    g.beginPath();
    g.moveTo(foreheadTop.x - faceWidth * 0.35, foreheadTop.y);
    g.lineTo(foreheadTop.x + faceWidth * 0.35, foreheadTop.y);
    g.lineTo(foreheadTop.x, foreheadTop.y - hatHeight);
    g.closePath();
    g.fill();
    g.fillStyle = "#fde68a";
    g.beginPath();
    g.arc(foreheadTop.x, foreheadTop.y - hatHeight, faceWidth * 0.08, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
};

export const simpleMaskAccessory: CameraEffectPlugin = {
  id: "accessory-simple-mask",
  name: "Color mask",
  category: "accessory",
  needsFaceLandmarks: true,
  apply(ctx) {
    const points = facePoints(ctx);
    if (!points) return;
    const { rightEye, leftEye, chin, foreheadTop } = points;
    const centerX = (rightEye.x + leftEye.x) / 2;
    const width = dist(rightEye, leftEye) * 2.2;
    const height = dist(foreheadTop, chin) * 0.7;

    const g = ctx.outputCtx;
    g.save();
    g.globalAlpha = 0.35;
    g.fillStyle = "#2563eb";
    g.beginPath();
    g.ellipse(centerX, (rightEye.y + leftEye.y) / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
};

/** Restrained by design (per the brief: "beauty smoothing with
 *  restrained defaults") — a light blur blended at low opacity over the
 *  face region only, not the full frame. */
export const beautySmoothingEffect: CameraEffectPlugin = {
  id: "beauty-smoothing",
  name: "Smoothing",
  category: "beauty",
  needsFaceLandmarks: true,
  apply(ctx) {
    const points = facePoints(ctx);
    if (!points) return;
    const { chin, foreheadTop, rightEdge, leftEdge } = points;
    const cx = (rightEdge.x + leftEdge.x) / 2;
    const cy = (foreheadTop.y + chin.y) / 2;
    const w = dist(rightEdge, leftEdge) * 1.1;
    const h = dist(foreheadTop, chin) * 1.3;

    const g = ctx.outputCtx;
    g.save();
    g.beginPath();
    g.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    g.clip();
    g.filter = "blur(4px)";
    g.globalAlpha = 0.5;
    g.drawImage(ctx.source, 0, 0, ctx.width, ctx.height);
    g.restore();
  }
};
