"use client";

import { Pause, Play, SkipForward, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  disconnectSpotifyAction,
  getSpotifyStatusAction,
  searchSpotifyAction,
  spotifyPauseAction,
  spotifyPlayTrackAction,
  spotifyResumeAction,
  type SpotifySearchResult
} from "@/app/room/[roomId]/spotify-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSpotifyPlayer } from "./use-spotify-player";
import { useSpotifySession } from "./use-spotify-session";

export function SpotifyDialog({ roomId }: { roomId: string }) {
  const [status, setStatus] = useState<{ connected: boolean; isPremium?: boolean } | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifySearchResult[]>([]);
  const [pending, startTransition] = useTransition();
  const lastAppliedRef = useRef<string | null>(null);

  const { session, queue, currentItem, addToQueue, removeFromQueue, setCurrentItem, setPlaybackState, playNext } =
    useSpotifySession(roomId);
  const canPlayLocally = Boolean(status?.connected && status.isPremium);
  const { deviceId } = useSpotifyPlayer(canPlayLocally);

  useEffect(() => {
    void getSpotifyStatusAction().then(setStatus);
  }, []);

  // Mirror the shared media_sessions state onto *this* browser's Spotify
  // Connect device, if we have one — see use-spotify-player.ts's header
  // comment on why this isn't a single shared stream.
  useEffect(() => {
    if (!deviceId || !currentItem || !session) return;
    const key = `${currentItem.id}:${session.playback_state}:${session.updated_at}`;
    if (lastAppliedRef.current === key) return;
    lastAppliedRef.current = key;

    if (session.playback_state === "playing") {
      void spotifyPlayTrackAction(deviceId, currentItem.external_id, session.position_ms);
    } else {
      void spotifyPauseAction(deviceId);
    }
  }, [deviceId, currentItem, session]);

  function handleSearch() {
    if (!query.trim()) return;
    startTransition(async () => {
      const result = await searchSpotifyAction(query);
      if (result.status === "error") toast.error(result.error);
      else setResults(result.results);
    });
  }

  async function handleTogglePlay() {
    if (!session) return;
    const playing = session.playback_state === "playing";
    await setPlaybackState(!playing, session.position_ms);
    if (deviceId) {
      if (playing) await spotifyPauseAction(deviceId);
      else await spotifyResumeAction(deviceId);
    }
  }

  if (!status) return null;

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Spotify</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Listen together</DialogTitle>
        </DialogHeader>

        {!status.connected ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">
              Connect Spotify to search tracks and sync the room&rsquo;s queue.
            </p>
            <Button render={<a href={`/spotify/connect?roomId=${roomId}`} />}>
              Connect Spotify
            </Button>
          </div>
        ) : (
          <>
            {!status.isPremium ? (
              <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                Spotify Premium is required to play music in this app (the Web Playback SDK
                doesn&rsquo;t support Free accounts). You can still see the current track and
                queue.
              </p>
            ) : null}

            {currentItem ? (
              <div className="flex items-center gap-3 rounded-md border p-2">
                {currentItem.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Spotify album art URL
                  <img src={currentItem.thumbnail_url} alt="" className="h-14 w-14 rounded" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{currentItem.title}</p>
                </div>
                {canPlayLocally ? (
                  <>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => void handleTogglePlay()}
                      aria-label={session?.playback_state === "playing" ? "Pause track" : "Play track"}
                      aria-pressed={session?.playback_state === "playing"}
                    >
                      {session?.playback_state === "playing" ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => void playNext()} aria-label="Skip to next track">
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <a
                    className="text-xs text-brand-600 underline"
                    href={`https://open.spotify.com/track/${currentItem.external_id.replace("spotify:track:", "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Spotify
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Queue is empty.</p>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Search tracks"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleSearch()}
              />
              <Button variant="outline" disabled={pending} onClick={handleSearch}>
                Search
              </Button>
            </div>

            {results.length > 0 ? (
              <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                {results.map((track) => (
                  <button
                    key={track.uri}
                    type="button"
                    className="flex items-center gap-2 rounded p-1 text-left text-xs hover:bg-muted"
                    onClick={() => {
                      void addToQueue(track.uri, `${track.name} — ${track.artists}`, track.albumArtUrl, track.durationMs);
                      setResults([]);
                      setQuery("");
                    }}
                  >
                    {track.albumArtUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Spotify album art URL
                      <img src={track.albumArtUrl} alt="" className="h-9 w-9 rounded" />
                    ) : null}
                    <span className="line-clamp-2">
                      {track.name} — {track.artists}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
              {queue.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded p-1 text-xs">
                  <button
                    type="button"
                    className="flex-1 truncate text-left hover:underline"
                    onClick={() => void setCurrentItem(item.id)}
                  >
                    {item.id === session?.current_item_id ? "▶ " : ""}
                    {item.title}
                  </button>
                  <button type="button" onClick={() => void removeFromQueue(item.id)}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <Button
              size="sm"
              variant="ghost"
              className="self-start text-muted-foreground"
              onClick={() =>
                void disconnectSpotifyAction().then(() => setStatus({ connected: false }))
              }
            >
              Disconnect Spotify
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
