"use client";

import type { PresenceStatus } from "@yume/room-schema";
import { useConnectionState, useMediaDeviceSelect, useTrackToggle } from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { Mic, MicOff, Monitor, MonitorOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateOwnStatusAction, updateRoomAudioModeAction } from "@/app/room/[roomId]/actions";
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
  const mic = useTrackToggle({ source: Track.Source.Microphone });
  const camera = useTrackToggle({ source: Track.Source.Camera });
  const screenShare = useTrackToggle({ source: Track.Source.ScreenShare });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="icon" variant={mic.enabled ? "default" : "outline"} onClick={() => mic.toggle()}>
        {mic.enabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      </Button>
      <DeviceSelect kind="audioinput" />

      <Button
        size="icon"
        variant={camera.enabled ? "default" : "outline"}
        onClick={() => camera.toggle()}
      >
        {camera.enabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
      </Button>
      <DeviceSelect kind="videoinput" />

      <Button
        size="icon"
        variant={screenShare.enabled ? "default" : "outline"}
        onClick={() => screenShare.toggle()}
        title="Share your screen"
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
          <span className="text-sm text-muted-foreground">Connecting…</span>
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
