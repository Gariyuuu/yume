"use client";

import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type NoiseKind = "white" | "brown";

/**
 * Synthesized noise, not "lo-fi" tracks — the brief's "lo-fi and ambient
 * audio options using properly licensed audio" needs real licensed music,
 * which this environment can't source or verify (same reasoning as the
 * placeholder decoration assets — see ASSET_LICENSES.md). White/brown
 * noise generated locally has no licensing question at all and is a
 * legitimate ambient option in its own right, not a stand-in pretending
 * to be lo-fi music.
 */
export function AmbientNoise() {
  const [playing, setPlaying] = useState(false);
  const [kind, setKind] = useState<NoiseKind>("white");
  const [volume, setVolume] = useState(0.3);
  const nodesRef = useRef<{ ctx: AudioContext; source: AudioBufferSourceNode; gain: GainNode } | null>(
    null
  );

  function buildNoiseBuffer(ctx: AudioContext, brown: boolean): AudioBuffer {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastValue = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) {
        lastValue = (lastValue + 0.02 * white) / 1.02;
        data[i] = lastValue * 3.5;
      } else {
        data[i] = white * 0.3;
      }
    }

    return buffer;
  }

  function start() {
    const AudioContextCtor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextCtor();
    const source = ctx.createBufferSource();
    source.buffer = buildNoiseBuffer(ctx, kind === "brown");
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    nodesRef.current = { ctx, source, gain };
    setPlaying(true);
  }

  function stop() {
    nodesRef.current?.source.stop();
    void nodesRef.current?.ctx.close();
    nodesRef.current = null;
    setPlaying(false);
  }

  useEffect(() => {
    if (nodesRef.current) nodesRef.current.gain.gain.value = volume;
  }, [volume]);

  useEffect(() => {
    return () => {
      nodesRef.current?.source.stop();
      void nodesRef.current?.ctx.close();
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Volume2 className="h-4 w-4 text-muted-foreground" />
      <select
        className="h-8 rounded-md border bg-transparent px-2 text-xs"
        value={kind}
        onChange={(event) => {
          const next = event.target.value as NoiseKind;
          setKind(next);
          if (playing) {
            stop();
          }
        }}
      >
        <option value="white">White noise</option>
        <option value="brown">Brown noise</option>
      </select>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={(event) => setVolume(Number(event.target.value))}
        className="w-20"
      />
      <Button size="sm" variant="outline" onClick={() => (playing ? stop() : start())}>
        {playing ? "Stop" : "Play"}
      </Button>
    </div>
  );
}
