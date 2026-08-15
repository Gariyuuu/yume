"use client";

import type { PresenceStatus } from "@yume/room-schema";
import {
  useConnectionState,
  useLocalParticipant,
  useMediaDeviceSelect,
  useTrackToggle
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { Mic, MicOff, Monitor, MonitorOff, PhoneOff, Sparkles, Video, VideoOff } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { updateOwnStatusAction, updateRoomAudioModeAction } from "@/app/room/[roomId]/actions";
import { CameraEffectsPanel } from "@/components/camera-effects/camera-effects-panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCallJoin } from "./room-call-provider";

const STATUS_OPTIONS: PresenceStatus[] = ["online", "away", "busy", "studying"];

function DeviceSelect({ kind }: { kind: "audioinput" | "videoinput" }) {
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind });

  if (devices.length === 0) return null;

  return (
    <select
      className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
      value={activeDeviceId}
      onChange={(event) => void setActiveMediaDevice(event.target.value)}
    >
      {devices.map((device) => (
        <option key={device.deviceId} value={device.deviceId}>
          {device.label || (kind === "audioinput" ? "Microphone" : "Camera")}
        </option>
      ))}
    </select>
  );
}

function InCallControls() {
  const { setJoined } = useCallJoin();
  const { localParticipant } = useLocalParticipant();
  const mic = useTrackToggle({ source: Track.Source.Microphone });
  const camera = useTrackToggle({ source: Track.Source.Camera });
  const screenShare = useTrackToggle({ source: Track.Source.ScreenShare });
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [effectsLive, setEffectsLive] = useState(false);
  const cameraWasOnRef = useRef(false);

  /** Swaps the published camera track for the effects pipeline's
   *  processed canvas stream (or back to the plain camera) — see
   *  components/camera-effects/use-camera-pipeline.ts. Unverified beyond
   *  typecheck: no LiveKit project to actually join a call against in
   *  this environment (same standing caveat as the rest of Phase 3-6's
   *  LiveKit work). */
  async function handlePublishEffects(stream: MediaStream | null) {
    if (stream) {
      cameraWasOnRef.current = camera.enabled;
      if (camera.enabled) await camera.toggle(false);
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        await localParticipant.publishTrack(videoTrack, {
          source: Track.Source.Camera,
          name: "effects-camera"
        });
      }
      setEffectsLive(true);
    } else {
      const publication = localParticipant.getTrackPublication(Track.Source.Camera);
      if (publication?.track) {
        await localParticipant.unpublishTrack(publication.track.mediaStreamTrack!, true);
      }
      setEffectsLive(false);
      if (cameraWasOnRef.current) await camera.toggle(true);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="icon"
        variant={mic.enabled ? "default" : "outline"}
        onClick={() => mic.toggle()}
        aria-label={mic.enabled ? "Mute microphone" : "Unmute microphone"}
        aria-pressed={mic.enabled}
      >
        {mic.enabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      </Button>
      <DeviceSelect kind="audioinput" />

      <Button
        size="icon"
        variant={camera.enabled || effectsLive ? "default" : "outline"}
        onClick={() => camera.toggle()}
        disabled={effectsLive}
        aria-label={camera.enabled ? "Turn off camera" : "Turn on camera"}
        aria-pressed={camera.enabled || effectsLive}
      >
        {camera.enabled || effectsLive ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
      </Button>
      <DeviceSelect kind="videoinput" />

      <Dialog open={effectsOpen} onOpenChange={setEffectsOpen}>
        <DialogTrigger render={<Button size="icon" variant={effectsLive ? "default" : "outline"} title="Camera effects" />}>
          <Sparkles className="h-4 w-4" />
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Camera effects</DialogTitle>
          </DialogHeader>
          <CameraEffectsPanel onPublish={handlePublishEffects} />
        </DialogContent>
      </Dialog>

      <Button
        size="icon"
        variant={screenShare.enabled ? "default" : "outline"}
        onClick={() => screenShare.toggle()}
        title="Share your screen"
        aria-label={screenShare.enabled ? "Stop sharing your screen" : "Share your screen"}
        aria-pressed={screenShare.enabled}
      >
        {screenShare.enabled ? <Monitor className="h-4 w-4" /> : <MonitorOff className="h-4 w-4" />}
      </Button>

      <Button size="icon" variant="destructive" onClick={() => setJoined(false)} title="Leave call">
        <PhoneOff className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function CallControls({
  roomId,
  audioMode,
  isHost,
  onStatusChange
}: {
  roomId: string;
  audioMode: "spatial" | "room_wide";
  isHost: boolean;
  onStatusChange: (status: PresenceStatus) => void;
}) {
  const { joined, setJoined } = useCallJoin();
  const connectionState = useConnectionState();
  const [, startTransition] = useTransition();

  const connecting = joined && connectionState !== ConnectionState.Connected;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border bg-card px-4 py-3">
      {joined ? (
        connecting ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <ThinkingOrb state="connecting" size={20} aria-label="Connecting to call" />
            Connecting…
          </span>
        ) : (
          <InCallControls />
        )
      ) : (
        <Button onClick={() => setJoined(true)}>Join call</Button>
      )}

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Status
          <select
            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs capitalize"
            defaultValue="online"
            onChange={(event) => {
              const status = event.target.value as PresenceStatus;
              onStatusChange(status);
              startTransition(() => {
                void updateOwnStatusAction(status);
              });
            }}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        {isHost ? (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Audio
            <select
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
              defaultValue={audioMode}
              onChange={(event) =>
                startTransition(() => {
                  void updateRoomAudioModeAction(
                    roomId,
                    event.target.value as "spatial" | "room_wide"
                  );
                })
              }
            >
              <option value="spatial">Spatial (quieter far away)</option>
              <option value="room_wide">Room-wide (everyone equal)</option>
            </select>
          </label>
        ) : null}
      </div>
    </div>
  );
}
