"use client";

import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { getLiveKitTokenAction } from "@/app/room/[roomId]/livekit-actions";

const CallJoinContext = createContext<{
  joined: boolean;
  setJoined: (joined: boolean) => void;
} | null>(null);

/** Lets a descendant (the join/leave button in CallControls) drive the
 *  LiveKitRoom `connect` prop without fighting its declarative connection
 *  lifecycle by calling room.connect()/disconnect() directly. */
export function useCallJoin() {
  const context = useContext(CallJoinContext);
  if (!context) throw new Error("useCallJoin must be used within RoomCallProvider");
  return context;
}

export function RoomCallProvider({
  roomId,
  children
}: {
  roomId: string;
  children: React.ReactNode;
}) {
  const [creds, setCreds] = useState<{ token: string; url: string } | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!joined || creds) return;

    getLiveKitTokenAction(roomId).then((result) => {
      if (result.status === "ok") {
        setCreds({ token: result.token, url: result.url });
      } else {
        toast.error(result.error);
        setJoined(false);
      }
    });
  }, [joined, creds, roomId]);

  return (
    <CallJoinContext.Provider value={{ joined, setJoined }}>
      <LiveKitRoom
        serverUrl={creds?.url}
        token={creds?.token}
        connect={joined && Boolean(creds)}
        audio={false}
        video={false}
        onDisconnected={() => setJoined(false)}
        onError={(error) => {
          toast.error(`Call connection error: ${error.message}`);
          setJoined(false);
        }}
      >
        <RoomAudioRenderer />
        {children}
      </LiveKitRoom>
    </CallJoinContext.Provider>
  );
}
