"use server";

import { requireUser } from "@/lib/auth/session";

export type YouTubeSearchResult = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
};

export type YouTubeSearchState =
  | { status: "ok"; results: YouTubeSearchResult[] }
  | { status: "error"; error: string };

/**
 * Keyword search needs the YouTube Data API v3 (unlike playback, which
 * needs no key at all — see docs/phase-1/07-api-capability-review.md).
 * Requires a real YOUTUBE_API_KEY env var; without one this returns a
 * clear error rather than silently doing nothing. Paste-a-URL/ID (see
 * extractYouTubeVideoId in lib/youtube.ts) works with zero configuration
 * and is the primary path.
 */
export async function searchYouTubeAction(query: string): Promise<YouTubeSearchState> {
  await requireUser();

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return {
      status: "error",
      error: "YouTube search isn't configured yet (missing YOUTUBE_API_KEY) — paste a video URL instead."
    };
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "8");
  url.searchParams.set("q", query);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  if (!response.ok) {
    return { status: "error", error: "YouTube search failed." };
  }

  const body = await response.json();
  const results: YouTubeSearchResult[] = (body.items ?? []).map(
    (item: { id: { videoId: string }; snippet: { title: string; thumbnails: { default: { url: string } } } }) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails.default.url
    })
  );

  return { status: "ok", results };
}
