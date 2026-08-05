function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in apps/web/.env.local from your Spotify Developer Dashboard app — see docs/phase-1/07-api-capability-review.md.`
    );
  }
  return value;
}

export function spotifyClientId() {
  return requireEnv("SPOTIFY_CLIENT_ID", process.env.SPOTIFY_CLIENT_ID);
}

export function spotifyClientSecret() {
  return requireEnv("SPOTIFY_CLIENT_SECRET", process.env.SPOTIFY_CLIENT_SECRET);
}

export const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing"
].join(" ");
