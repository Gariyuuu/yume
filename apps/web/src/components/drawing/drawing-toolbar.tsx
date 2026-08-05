"use client";

import { Download, Eraser, Highlighter, Lock, Pencil, Trash2, Unlock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { useDrawingLayer } from "./use-drawing-layer";

const COLORS = ["#1f1f1f", "#dc2626", "#2563eb", "#16a34a", "#eab308", "#ffffff"];

export function DrawingToolbar({
  drawing,
  canManageAll
}: {
  drawing: ReturnType<typeof useDrawingLayer>;
  canManageAll: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { drawMode, setDrawMode, tool, setTool, color, setColor, width, setWidth, layerLocked, canDraw } =
    drawing;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-card border bg-card p-2">
      <Button
        size="sm"
        variant={drawMode ? "default" : "outline"}
        disabled={!canDraw}
        onClick={() => setDrawMode(!drawMode)}
      >
        <Pencil className="mr-1.5 h-4 w-4" /> Draw
      </Button>

      {drawMode ? (
        <>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant={tool === "pen" ? "default" : "ghost"}
              onClick={() => setTool("pen")}
              title="Pen"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={tool === "highlighter" ? "default" : "ghost"}
              onClick={() => setTool("highlighter")}
              title="Highlighter"
            >
              <Highlighter className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={tool === "eraser" ? "default" : "ghost"}
              onClick={() => setTool("eraser")}
              title="Eraser"
            >
              <Eraser className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            {COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={swatch}
                className={cn(
                  "h-6 w-6 rounded-full border-2",
                  color === swatch ? "border-brand-500" : "border-transparent"
                )}
                style={{ backgroundColor: swatch }}
                onClick={() => setColor(swatch)}
              />
            ))}
          </div>

          <input
            type="range"
            min={1}
            max={20}
            value={width}
            onChange={(event) => setWidth(Number(event.target.value))}
            className="w-24"
          />

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger render={<Button size="icon" variant="ghost" title="Clear canvas" />}>
              <Trash2 className="h-4 w-4" />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Clear the whole drawing?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                This erases everything on the drawing layer for everyone in the room. This can&rsquo;t
                be undone.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    void drawing.handleClear();
                    setConfirmOpen(false);
                  }}
                >
                  Clear it
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button size="icon" variant="ghost" title="Export as PNG" onClick={drawing.handleExport}>
            <Download className="h-4 w-4" />
          </Button>

          {canManageAll ? (
            <Button
              size="icon"
              variant="ghost"
              title={layerLocked ? "Unlock drawing layer" : "Lock drawing layer"}
              onClick={() => void drawing.handleToggleLock()}
            >
              {layerLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </Button>
          ) : null}
        </>
      ) : layerLocked ? (
        <span className="text-xs text-muted-foreground">Drawing layer is locked</span>
      ) : null}
    </div>
  );
}
