"use client";

import type { RoomObject } from "@yume/room-schema";
import { useState } from "react";

/** Positioned in the same coordinate space as the Stage (see the `relative`
 *  container in room-canvas.tsx) — object x/y/width/height map 1:1 to
 *  pixels there since the room canvas doesn't pan or zoom. */
export function TextEditOverlay({
  object,
  onSave,
  onCancel
}: {
  object: RoomObject;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const initialText =
    typeof object.data?.["text"] === "string" ? (object.data["text"] as string) : "";
  const [value, setValue] = useState(initialText);

  return (
    <textarea
      autoFocus
      className="pointer-events-auto absolute resize-none rounded-md border-2 border-brand-500 bg-white/95 p-2 text-sm outline-none"
      style={{ left: object.x, top: object.y, width: object.width, height: object.height }}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => onSave(value)}
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) onSave(value);
      }}
    />
  );
}
