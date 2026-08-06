"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { loadYouTubeIframeApi, YT_PLAYER_STATE, type YouTubePlayer } from "@/lib/youtube";

const DRIFT_THRESHOLD_SECONDS = 1.5;
const DRIFT_CHECK_MS = 5000;

export function YouTubePlayerView({
  videoId,
  playing,
  positionMs,
  updatedAt
}: {
  videoId: string;
  playing: boolean;
  positionMs: number;
  updatedAt: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const currentVideoIdRef = useRef(videoId);
  // Real ref-backed state (not a plain ref) so effects that need to
  // *react* to the player becoming ready — the sync effect below — can
  // list it as a dependency and fire immediately, instead of only
  // catching up on the next 5s drift-check tick.
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void loadYouTubeIframeApi().then(() => {
      if (cancelled || !containerRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        // Start muted: browsers block programmatic playVideo() unless
        // it's a direct result of a user gesture (a click) *or* the
        // player is muted — "muted autoplay is always allowed" is a
        // standard, documented exemption in Chrome/Safari autoplay
        // policy. Sync here is driven by a realtime event from other
        // room members, not a click, so without this the video loads
        // but silently never actually plays for anyone who didn't
        // personally just click something. See the unmute button below.
        playerVars: { mute: 1, playsinline: 1 },
        events: {
          onReady: () => setReady(true)
        }
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- player is created once; video/state changes are applied imperatively below, not by recreating the player
  }, []);

  // Swap videos without recreating the whole player.
  useEffect(() => {
    if (!ready || !playerRef.current) return;
    if (currentVideoIdRef.current === videoId) return;
    currentVideoIdRef.current = videoId;
    playerRef.current.loadVideoById(videoId);
  }, [ready, videoId]);

  // Apply remote play/pause/seek state, then periodically correct drift —
  // see docs/phase-1/05-sync-protocol.md §5. `ready` in the deps means
  // this fires the instant the player becomes usable, not just on the
  // next 5s tick.
  useEffect(() => {
    if (!ready) return;

    const expectedSeconds =
      positionMs / 1000 + (playing ? (Date.now() - new Date(updatedAt).getTime()) / 1000 : 0);

    function applySync() {
      const player = playerRef.current;
      if (!player) return;

      const state = player.getPlayerState();
      if (playing && state !== YT_PLAYER_STATE.PLAYING) player.playVideo();
      if (!playing && state === YT_PLAYER_STATE.PLAYING) player.pauseVideo();

      const drift = Math.abs(player.getCurrentTime() - expectedSeconds);
      if (drift > DRIFT_THRESHOLD_SECONDS) player.seekTo(expectedSeconds, true);
    }

    applySync();
    const interval = setInterval(applySync, DRIFT_CHECK_MS);
    return () => clearInterval(interval);
  }, [ready, playing, positionMs, updatedAt]);

  return (
    <div className="relative">
      <div ref={containerRef} className="aspect-video w-full overflow-hidden rounded-md" />
      {ready ? (
        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-2 right-2"
          onClick={() => {
            const player = playerRef.current;
            if (!player) return;
            if (muted) player.unMute();
            else player.mute();
            setMuted(!muted);
          }}
          aria-label={muted ? "Unmute video" : "Mute video"}
          aria-pressed={!muted}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      ) : null}
    </div>
  );
}
