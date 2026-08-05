"use client";

import dynamic from "next/dynamic";
import type { useDrawingLayer } from "./use-drawing-layer";

// Same reason as room-canvas-loader.tsx: Konva needs `window`, so this can
// only ever render client-side.
const DrawingCanvas = dynamic(
  () => import("./drawing-canvas").then((module) => module.DrawingCanvas),
  { ssr: false }
);

export function DrawingCanvasLoader({ drawing }: { drawing: ReturnType<typeof useDrawingLayer> }) {
  return <DrawingCanvas drawing={drawing} />;
}
