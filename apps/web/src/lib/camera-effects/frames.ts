import type { CameraEffectPlugin } from "./types";

function borderFrame(id: string, name: string, color: string): CameraEffectPlugin {
  return {
    id,
    name,
    category: "frame",
    apply(ctx) {
      const g = ctx.outputCtx;
      const thickness = Math.round(ctx.width * 0.025);
      g.save();
      g.strokeStyle = color;
      g.lineWidth = thickness;
      g.strokeRect(thickness / 2, thickness / 2, ctx.width - thickness, ctx.height - thickness);
      g.restore();
    }
  };
}

export const frameEffects: CameraEffectPlugin[] = [
  borderFrame("frame-brand", "Brand border", "#bb3af0"),
  borderFrame("frame-gold", "Gold border", "#eab308"),
  {
    id: "frame-polaroid",
    name: "Polaroid",
    category: "frame",
    apply(ctx) {
      const g = ctx.outputCtx;
      const margin = Math.round(ctx.width * 0.04);
      const bottom = Math.round(ctx.height * 0.14);
      g.save();
      g.strokeStyle = "#ffffff";
      g.lineWidth = margin;
      g.strokeRect(margin / 2, margin / 2, ctx.width - margin, ctx.height - margin);
      g.fillStyle = "#ffffff";
      g.fillRect(0, ctx.height - bottom, ctx.width, bottom);
      g.restore();
    }
  }
];
