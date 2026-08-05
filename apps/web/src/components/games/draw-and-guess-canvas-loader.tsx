"use client";

import dynamic from "next/dynamic";

const DrawAndGuessCanvas = dynamic(
  () => import("./draw-and-guess-canvas").then((m) => m.DrawAndGuessCanvas),
  { ssr: false, loading: () => <div className="h-[280px] w-[480px] rounded-md border bg-white" /> }
);

export function DrawAndGuessCanvasLoader(props: { sessionId: string; isDrawer: boolean }) {
  return <DrawAndGuessCanvas {...props} />;
}
