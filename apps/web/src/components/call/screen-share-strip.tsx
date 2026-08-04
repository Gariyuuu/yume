"use client";

import { useTracks, VideoTrack } from "@livekit/components-react";
import { Track } from "livekit-client";

export function ScreenShareStrip() {
  const screenShares = useTracks([Track.Source.ScreenShare]);

  if (screenShares.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto rounded-card border bg-card p-3">
      {screenShares.map((trackRef) => (
        <div key={trackRef.publication.trackSid} className="flex flex-col gap-1">
          <VideoTrack
            trackRef={trackRef}
            className="h-[160px] w-[280px] rounded-md bg-black object-contain"
          />
          <span className="text-xs text-muted-foreground">
            {trackRef.participant.name || trackRef.participant.identity}&rsquo;s screen
          </span>
        </div>
      ))}
    </div>
  );
}
