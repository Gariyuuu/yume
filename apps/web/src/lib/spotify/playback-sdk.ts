/** Verify against https://developer.spotify.com/documentation/web-playback-sdk
 *  before relying on this beyond the current phase. Requires a Premium
 *  account — see docs/phase-1/07-api-capability-review.md. */
export type SpotifyPlayerState = {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: { name: string; artists: { name: string }[]; album: { images: { url: string }[] } };
  };
};

export type SpotifyPlayer = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (
    event: "ready" | "not_ready" | "player_state_changed",
    callback: (state: { device_id: string } | SpotifyPlayerState | null) => void
  ) => void;
};

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (callback: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

let loadPromise: Promise<void> | null = null;

export function loadSpotifyPlaybackSdk(): Promise<void> {
  if (window.Spotify) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    const previous = window.onSpotifyWebPlaybackSDKReady;
    window.onSpotifyWebPlaybackSDKReady = () => {
      previous?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://sdk.scdn.co/spotify-player.js";
    document.head.appendChild(tag);
  });

  return loadPromise;
}
