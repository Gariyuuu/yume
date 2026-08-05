import "server-only";
import { createClient } from "@/lib/supabase/server";
import { spotifyClientId, spotifyClientSecret } from "./env";

const REFRESH_BUFFER_MS = 60_000;

/**
 * Returns a valid access token for the signed-in user's connected Spotify
 * account, refreshing it first if it's expired or about to be — see
 * docs/phase-1/04-security-rls.md §5's revised note on why this lives in
 * Next.js server code (Route Handlers/Server Actions) rather than a
 * separate Edge Function. Returns null if the user hasn't connected
 * Spotify.
 */
export async function getValidSpotifyAccessToken(profileId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: connection } = await supabase
    .from("spotify_connections")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!connection) return null;

  const expiresAt = new Date(connection.expires_at).getTime();
  if (expiresAt - REFRESH_BUFFER_MS > Date.now()) {
    return connection.access_token;
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${spotifyClientId()}:${spotifyClientSecret()}`).toString("base64")}`
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token
    })
  });

  if (!response.ok) return null;

  const body = await response.json();
  const newExpiresAt = new Date(Date.now() + body.expires_in * 1000).toISOString();

  await supabase
    .from("spotify_connections")
    .update({
      access_token: body.access_token,
      refresh_token: body.refresh_token ?? connection.refresh_token,
      expires_at: newExpiresAt
    })
    .eq("profile_id", profileId);

  return body.access_token as string;
}
