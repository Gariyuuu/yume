"use client";

import { useEffect, useRef } from "react";
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
  const readyRef = useRef(false);
  const currentVideoIdRef = useRef(videoId);

  useEffect(() => {
    let cancelled = false;

    void loadYouTubeIframeApi().then(() => {
      if (cancelled || !containerRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        events: {
          onReady: () => {
            readyRef.current = true;
          }
        }
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- player is created once; video/state changes are applied imperatively below, not by recreating the player
  }, []);

  // Swap videos without recreating the whole player.
  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return;
    if (currentVideoIdRef.current === videoId) return;
    currentVideoIdRef.current = videoId;
    playerRef.current.loadVideoById(videoId);
  }, [videoId]);

  // Apply remote play/pause/seek state, then periodically correct drift —
  // see docs/phase-1/05-sync-protocol.md §5.
  useEffect(() => {
    const expectedSeconds =
      positionMs / 1000 + (playing ? (Date.now() - new Date(updatedAt).getTime()) / 1000 : 0);

    function applySync() {
      const player = playerRef.current;
      if (!player || !readyRef.current) return;

      const state = player.getPlayerState();
      if (playing && state !== YT_PLAYER_STATE.PLAYING) player.playVideo();
      if (!playing && state === YT_PLAYER_STATE.PLAYING) player.pauseVideo();

      const drift = Math.abs(player.getCurrentTime() - expectedSeconds);
      if (drift > DRIFT_THRESHOLD_SECONDS) player.seekTo(expectedSeconds, true);
    }

    applySync();
    const interval = setInterval(applySync, DRIFT_CHECK_MS);
    return () => clearInterval(interval);
  }, [playing, positionMs, updatedAt]);

  return <div ref={containerRef} className="aspect-video w-full overflow-hidden rounded-md" />;
}
