"use client";

import { useRef } from "react";
import { Layer, Line, Stage } from "react-konva";
import { useDrawAndGuessCanvas } from "./use-draw-and-guess-canvas";

const WIDTH = 480;
const HEIGHT = 280;

export function DrawAndGuessCanvas({ sessionId, isDrawer }: { sessionId: string; isDrawer: boolean }) {
  const { strokes, addLocalPoints } = useDrawAndGuessCanvas(sessionId, isDrawer);
  const currentStrokeId = useRef<string | null>(null);
  const currentPoints = useRef<number[]>([]);

  return (
    <Stage
      width={WIDTH}
      height={HEIGHT}
      className="rounded-md border bg-white"
      onMouseDown={(event) => {
        if (!isDrawer) return;
        const pos = event.target.getStage()?.getPointerPosition();
        if (!pos) return;
        currentStrokeId.current = crypto.randomUUID();
        currentPoints.current = [pos.x, pos.y];
        addLocalPoints(currentStrokeId.current, currentPoints.current);
      }}
      onMouseMove={(event) => {
        if (!isDrawer || !currentStrokeId.current) return;
        const pos = event.target.getStage()?.getPointerPosition();
        if (!pos) return;
        currentPoints.current = [...currentPoints.current, pos.x, pos.y];
        addLocalPoints(currentStrokeId.current, currentPoints.current);
      }}
      onMouseUp={() => {
        currentStrokeId.current = null;
        currentPoints.current = [];
      }}
    >
      <Layer listening={false}>
        {Object.entries(strokes).map(([strokeId, points]) => (
          <Line
            key={strokeId}
            points={points}
            stroke="#1f1f1f"
            strokeWidth={3}
            lineCap="round"
            lineJoin="round"
            tension={0.4}
          />
        ))}
      </Layer>
    </Stage>
  );
}
