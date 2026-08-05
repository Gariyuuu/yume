"use client";

import { useEffect, useRef, useState } from "react";
import { getSpotifyAccessTokenAction } from "@/app/room/[roomId]/spotify-actions";
import { loadSpotifyPlaybackSdk, type SpotifyPlayer, type SpotifyPlayerState } from "@/lib/spotify/playback-sdk";

/**
 * Each room member who is Spotify Premium + connected gets their own
 * Spotify Connect device via this SDK instance — there is no official
 * "one shared stream" API (see docs/phase-1/07-api-capability-review.md:
 * don't claim Spotify Jam support that isn't there). Everyone's device
 * gets told to play the same track/position, so it sounds synced, but
 * each person is streaming through their own Premium session.
 */
export function useSpotifyPlayer(enabled: boolean) {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<SpotifyPlayerState | null>(null);
  const playerRef = useRef<SpotifyPlayer | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    void loadSpotifyPlaybackSdk().then(() => {
      if (cancelled || !window.Spotify) return;

      const player = new window.Spotify.Player({
        name: "Yume room",
        getOAuthToken: (callback) => {
          void getSpotifyAccessTokenAction().then((token) => {
            if (token) callback(token);
          });
        },
        volume: 0.7
      });

      player.addListener("ready", (state) => {
        if (state && "device_id" in state) setDeviceId(state.device_id);
      });
      player.addListener("not_ready", () => setDeviceId(null));
      player.addListener("player_state_changed", (state) => {
        if (state && "paused" in state) setPlayerState(state);
      });

      void player.connect();
      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, [enabled]);

  return { deviceId, playerState };
}
