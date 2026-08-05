"use client";

import type { RoomObject } from "@yume/room-schema";
import { useCallback, useRef, useState } from "react";

export type UndoEntry =
  | { kind: "create"; object: RoomObject }
  | { kind: "delete"; object: RoomObject }
  | { kind: "update"; id: string; before: Partial<RoomObject>; after: Partial<RoomObject> };

const MAX_STACK = 50;

/**
 * Local-only, per-user undo/redo (like Figma/most collaborative editors —
 * not a distributed undo across everyone's actions, just yours, for this
 * browser tab). `apply` receives the entry to reverse (for undo) or
 * reapply (for redo) and does the actual Postgres write + local state
 * update; this hook only manages the two stacks.
 */
export function useUndoRedo(apply: (entry: UndoEntry, direction: "undo" | "redo") => void) {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoStack = useRef<UndoEntry[]>([]);
  const redoStack = useRef<UndoEntry[]>([]);

  const sync = useCallback(() => {
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  const push = useCallback(
    (entry: UndoEntry) => {
      undoStack.current.push(entry);
      if (undoStack.current.length > MAX_STACK) undoStack.current.shift();
      redoStack.current = [];
      sync();
    },
    [sync]
  );

  const undo = useCallback(() => {
    const entry = undoStack.current.pop();
    if (!entry) return;
    apply(entry, "undo");
    redoStack.current.push(entry);
    sync();
  }, [apply, sync]);

  const redo = useCallback(() => {
    const entry = redoStack.current.pop();
    if (!entry) return;
    apply(entry, "redo");
    undoStack.current.push(entry);
    sync();
  }, [apply, sync]);

  return { push, undo, redo, canUndo, canRedo };
}
