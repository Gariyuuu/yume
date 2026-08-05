"use client";

import { Maximize, Pause, Play, SkipForward, Trash2, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { extractYouTubeVideoId } from "@/lib/youtube";
import { searchYouTubeAction, type YouTubeSearchResult } from "@/app/room/[roomId]/youtube-actions";
import { useYouTubeSession } from "./use-youtube-session";
import { YouTubePlayerView } from "./youtube-player";

export function YouTubeDialog({
  roomId,
  canManageAll
}: {
  roomId: string;
  canManageAll: boolean;
}) {
  const {
    session,
    queue,
    currentItem,
    addToQueue,
    removeFromQueue,
    playItem,
    setPlaybackState,
    playNext,
    setControlMode
  } = useYouTubeSession(roomId);
  const [urlInput, setUrlInput] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [pending, startTransition] = useTransition();
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const canControl = canManageAll || session?.control_mode === "collaborative";
  const isPlaying = session?.playback_state === "playing";

  function handleAddUrl() {
    const videoId = extractYouTubeVideoId(urlInput);
    if (!videoId) {
      toast.error("That doesn't look like a YouTube link or video ID.");
      return;
    }
    void addToQueue(videoId);
    setUrlInput("");
  }

  function handleSearch() {
    if (!query.trim()) return;
    startTransition(async () => {
      const result = await searchYouTubeAction(query);
      if (result.status === "error") toast.error(result.error);
      else setResults(result.results);
    });
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>YouTube</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Watch together</DialogTitle>
        </DialogHeader>

        {currentItem ? (
          <div ref={playerContainerRef} className="flex flex-col gap-2">
            <YouTubePlayerView
              videoId={currentItem.external_id}
              playing={isPlaying}
              positionMs={session?.position_ms ?? 0}
              updatedAt={session?.updated_at ?? new Date().toISOString()}
            />
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                disabled={!canControl}
                onClick={() => void setPlaybackState(!isPlaying, session?.position_ms ?? 0)}
                aria-label={isPlaying ? "Pause video" : "Play video"}
                aria-pressed={isPlaying}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="outline"
                disabled={!canControl}
                onClick={() => void playNext()}
                aria-label="Skip to next video"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => void playerContainerRef.current?.requestFullscreen()}
                title="Fullscreen"
              >
                <Maximize className="h-4 w-4" />
              </Button>
              <span
                className="text-xs text-muted-foreground"
                title="Picture-in-picture isn't reliably scriptable for a cross-origin YouTube embed — use your browser's own PiP if it offers one for this tab."
              >
                PiP: use your browser
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing queued yet.</p>
        )}

        {canManageAll ? (
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={session?.control_mode === "collaborative"}
              onChange={(event) =>
                void setControlMode(event.target.checked ? "collaborative" : "host_only")
              }
            />
            Let anyone control playback (not just owner/moderator)
          </label>
        ) : null}

        <div className="flex gap-2">
          <Input
            placeholder="Paste a YouTube link or video ID"
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleAddUrl()}
          />
          <Button onClick={handleAddUrl}>Add</Button>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Search YouTube"
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
            {results.map((result) => (
              <button
                key={result.videoId}
                type="button"
                className="flex items-center gap-2 rounded p-1 text-left text-xs hover:bg-muted"
                onClick={() => {
                  void addToQueue(result.videoId, result.title);
                  setResults([]);
                  setQuery("");
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- third-party YouTube thumbnail URL */}
                <img src={result.thumbnailUrl} alt="" className="h-9 w-16 rounded object-cover" />
                <span className="line-clamp-2">{result.title}</span>
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
                onClick={() => void playItem(item.id)}
              >
                {item.id === session?.current_item_id ? "▶ " : ""}
                {item.title ?? item.external_id}
              </button>
              <button type="button" onClick={() => void removeFromQueue(item.id)}>
                {item.id === session?.current_item_id ? (
                  <X className="h-3 w-3 opacity-40" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
