"use client";

import type { RoomObject } from "@yume/room-schema";
import dynamic from "next/dynamic";

// Konva touches `window`/`document` at import time, so it can only ever
// render on the client — `ssr: false` is only valid from within a Client
// Component in the App Router, which is why this wrapper exists separately
// from the server-rendered room page.
const RoomCanvas = dynamic(
  () => import("./room-canvas").then((module) => module.RoomCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center text-sm text-muted-foreground">
        Loading room…
      </div>
    )
  }
);

export function RoomCanvasLoader(props: {
  roomId: string;
  initialObjects: RoomObject[];
  currentProfileId: string;
  canManageAll: boolean;
}) {
  return <RoomCanvas {...props} />;
}
