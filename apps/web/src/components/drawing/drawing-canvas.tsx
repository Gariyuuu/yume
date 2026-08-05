"use client";

import { Layer, Line, Stage } from "react-konva";
import { ROOM_HEIGHT, ROOM_WIDTH } from "@/components/room-canvas/room-dimensions";
import type { useDrawingLayer } from "./use-drawing-layer";

function flatten(points: Array<[number, number]>): number[] {
  return points.flat();
}

/** Absolutely positioned over the decoration canvas (see the `overlay`
 *  slot in room-canvas.tsx) — pointer-events only capture while draw mode
 *  is on, so the decoration canvas underneath stays interactive the rest
 *  of the time. */
export function DrawingCanvas({ drawing }: { drawing: ReturnType<typeof useDrawingLayer> }) {
  const { stageRef, drawMode, strokes, drawingStroke, liveStrokes, liveCursors } = drawing;

  const allStrokes = [
    ...strokes,
    ...Object.values(liveStrokes),
    ...(drawingStroke ? [drawingStroke] : [])
  ];

  return (
    <div
      className="absolute left-0 top-0"
      style={{
        width: ROOM_WIDTH,
        height: ROOM_HEIGHT,
        pointerEvents: drawMode ? "auto" : "none",
        cursor: drawMode ? "crosshair" : undefined
      }}
    >
      <Stage
        ref={stageRef}
        width={ROOM_WIDTH}
        height={ROOM_HEIGHT}
        onMouseDown={(event) => {
          const pos = event.target.getStage()?.getPointerPosition();
          if (pos) drawing.handlePointerDown(pos.x, pos.y);
        }}
        onMouseMove={(event) => {
          const pos = event.target.getStage()?.getPointerPosition();
          if (pos) drawing.handlePointerMove(pos.x, pos.y);
        }}
        onMouseUp={drawing.handlePointerUp}
        onMouseLeave={drawing.handlePointerUp}
      >
        <Layer listening={false}>
          {allStrokes.map((stroke) => (
            <Line
              key={stroke.id}
              points={flatten(stroke.points)}
              stroke={stroke.color}
              strokeWidth={stroke.width}
              opacity={stroke.tool === "highlighter" ? 0.4 : 1}
              globalCompositeOperation={stroke.tool === "eraser" ? "destination-out" : "source-over"}
              lineCap="round"
              lineJoin="round"
              tension={0.4}
            />
          ))}
        </Layer>
      </Stage>

      {Object.entries(liveCursors).map(([profileId, pos]) => (
        <div
          key={profileId}
          className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500"
          style={{ left: pos.x, top: pos.y }}
        />
      ))}
    </div>
  );
}
