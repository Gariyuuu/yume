"use client";

import {
  Copy,
  Grid3x3,
  Lock,
  Redo2,
  SendToBack,
  Trash2,
  Undo2,
  Unlock,
  ZoomIn
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function DecorationToolbar({
  hasSelection,
  allLocked,
  snapToGrid,
  canUndo,
  canRedo,
  onDuplicate,
  onDelete,
  onToggleLock,
  onBringForward,
  onSendBackward,
  onToggleSnap,
  onUndo,
  onRedo
}: {
  hasSelection: boolean;
  allLocked: boolean;
  snapToGrid: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleLock: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onToggleSnap: () => void;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-card border bg-card p-2">
      <Button size="icon" variant="ghost" disabled={!canUndo} onClick={onUndo} title="Undo">
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" disabled={!canRedo} onClick={onRedo} title="Redo">
        <Redo2 className="h-4 w-4" />
      </Button>

      <div className="mx-1 h-5 w-px bg-border" />

      <Button
        size="icon"
        variant="ghost"
        disabled={!hasSelection}
        onClick={onDuplicate}
        title="Duplicate"
      >
        <Copy className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        disabled={!hasSelection}
        onClick={onToggleLock}
        title={allLocked ? "Unlock" : "Lock"}
      >
        {allLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        disabled={!hasSelection}
        onClick={onBringForward}
        title="Bring forward"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        disabled={!hasSelection}
        onClick={onSendBackward}
        title="Send backward"
      >
        <SendToBack className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="destructive"
        disabled={!hasSelection}
        onClick={onDelete}
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <div className="mx-1 h-5 w-px bg-border" />

      <Button
        size="icon"
        variant={snapToGrid ? "default" : "ghost"}
        onClick={onToggleSnap}
        title="Snap to grid"
      >
        <Grid3x3 className="h-4 w-4" />
      </Button>
    </div>
  );
}
