"use server";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getValidSpotifyAccessToken } from "@/lib/spotify/token";

export type SpotifyStatus =
  | { connected: false }
  | { connected: true; isPremium: boolean };

export async function getSpotifyStatusAction(): Promise<SpotifyStatus> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("spotify_connections")
    .select("is_premium")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!data) return { connected: false };
  return { connected: true, isPremium: Boolean(data.is_premium) };
}

/**
 * The Web Playback SDK necessarily runs in the browser and needs a real
 * user access token to authenticate with Spotify's streaming servers —
 * that's Spotify's own architecture, not a gap in how carefully this app
 * guards the token otherwise (see lib/spotify/token.ts's header comment).
 */
export async function getSpotifyAccessTokenAction(): Promise<string | null> {
  const user = await requireUser();
  return getValidSpotifyAccessToken(user.id);
}

export async function disconnectSpotifyAction(): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("spotify_connections").delete().eq("profile_id", user.id);
}

export type SpotifySearchResult = {
  uri: string;
  name: string;
  artists: string;
  albumArtUrl: string | null;
  durationMs: number;
};

export async function searchSpotifyAction(
  query: string
): Promise<{ status: "ok"; results: SpotifySearchResult[] } | { status: "error"; error: string }> {
  const user = await requireUser();
  const token = await getValidSpotifyAccessToken(user.id);
  if (!token) return { status: "error", error: "Connect Spotify first." };

  const url = new URL("https://api.spotify.com/v1/search");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "track");
  url.searchParams.set("limit", "8");

  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return { status: "error", error: "Spotify search failed." };

  const body = await response.json();
  const results: SpotifySearchResult[] = (body.tracks?.items ?? []).map(
    (track: {
      uri: string;
      name: string;
      artists: { name: string }[];
      album: { images: { url: string }[] };
      duration_ms: number;
    }) => ({
      uri: track.uri,
      name: track.name,
      artists: track.artists.map((a) => a.name).join(", "),
      albumArtUrl: track.album.images[0]?.url ?? null,
      durationMs: track.duration_ms
    })
  );

  return { status: "ok", results };
}

/**
 * Directly starts playback of a specific track URI on the given device —
 * we drive our own ordering via media_queue_items rather than Spotify's
 * native queue, since the Web API only lets you append to a live device's
 * queue, not manage an arbitrary reorderable one (see
 * docs/phase-1/07-api-capability-review.md).
 */
export async function spotifyPlayTrackAction(
  deviceId: string,
  uri: string,
  positionMs = 0
): Promise<{ error?: string }> {
  const user = await requireUser();
  const token = await getValidSpotifyAccessToken(user.id);
  if (!token) return { error: "Connect Spotify first." };

  const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ uris: [uri], position_ms: positionMs })
  });

  if (!response.ok) return { error: "Could not start playback." };
  return {};
}

export async function spotifyPauseAction(deviceId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const token = await getValidSpotifyAccessToken(user.id);
  if (!token) return { error: "Connect Spotify first." };

  const response = await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) return { error: "Could not pause." };
  return {};
}

export async function spotifyResumeAction(deviceId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const token = await getValidSpotifyAccessToken(user.id);
  if (!token) return { error: "Connect Spotify first." };

  const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) return { error: "Could not resume." };
  return {};
}

export async function spotifySeekAction(deviceId: string, positionMs: number): Promise<{ error?: string }> {
  const user = await requireUser();
  const token = await getValidSpotifyAccessToken(user.id);
  if (!token) return { error: "Connect Spotify first." };

  const response = await fetch(
    `https://api.spotify.com/v1/me/player/seek?device_id=${deviceId}&position_ms=${Math.round(positionMs)}`,
    { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) return { error: "Could not seek." };
  return {};
}
