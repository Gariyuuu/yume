# 05 — Room Synchronization Protocol

Concrete channel/message spec implementing the two-tier model from
[02-architecture.md](02-architecture.md) §4.

## 1. Channels

All realtime traffic for a room is scoped under one Supabase Realtime
channel per concern, named by convention `room:{roomId}:{concern}`:

| Channel | Type | Purpose |
|---|---|---|
| `room:{roomId}:presence` | Presence | who's connected, status, cursor-level "which object am I dragging" |
| `room:{roomId}:live` | Broadcast | ephemeral object drag, live drawing points, emoji bursts, typing indicators |
| `room:{roomId}:objects` | Postgres Changes on `room_objects` | persisted object create/update/delete fan-out |
| `room:{roomId}:chat` | Postgres Changes on `room_messages` + `message_reactions` | chat fan-out |
| `room:{roomId}:media` | Broadcast + Postgres Changes on `media_sessions` | YouTube/Spotify play/pause/seek + drift correction pings |
| `room:{roomId}:game:{sessionId}` | Broadcast + Postgres Changes on `game_events`/`game_sessions` | per-game-session moves and state |

A client subscribes to `presence`, `live`, `objects`, and `chat` on room
entry; `media` and `game:*` are subscribed to only while that feature is
active, to keep idle rooms cheap.

## 2. Presence payload

```ts
type RoomPresence = {
  profileId: string
  displayName: string
  status: 'online' | 'away' | 'busy' | 'studying' | 'offline'
  bubble: { x: number; y: number }   // last known resting position, not live drag
  livekitConnected: boolean
  muted: boolean
  cameraOn: boolean
  speaking: boolean
}
```

Tracked via `channel.track(payload)`; Supabase's Presence protocol handles
join/leave/heartbeat automatically. `speaking` is derived client-side from
LiveKit's audio level events on the local track and re-broadcast into
presence at a throttled rate (~4 Hz), not from LiveKit directly, since not
everyone subscribing to presence is necessarily subscribed to that
person's LiveKit audio track's raw level events in a convenient form.

## 3. Tier 1 — Broadcast message shapes (`room:{roomId}:live`)

```ts
type LiveEvent =
  | { kind: 'object_drag'; objectId: string; x: number; y: number; by: string }
  | { kind: 'stroke_point'; strokeId: string; points: [number, number][]; color: string; width: number; by: string }
  | { kind: 'reaction'; emoji: string; by: string; targetProfileId?: string }
  | { kind: 'typing'; by: string; inChat: boolean }
  | { kind: 'cursor'; x: number; y: number; by: string } // drawing-layer only
```

Client throttling: `object_drag` at ~20 Hz max (requestAnimationFrame-
gated, coalesced to latest position per frame); `stroke_point` batches
several points per message rather than one message per point. No handler
ever writes these directly to Postgres — see Tier 2 for what happens at
drag-end / stroke-end.

## 4. Tier 2 — persisted writes

- **Object drag end:** client sends one `update` to `room_objects`
  (`x, y, updated_at, updated_by`) through the RLS-guarded client call once
  the user releases the object. All other clients receive this via the
  `room:{roomId}:objects` Postgres Changes subscription and snap the
  object to the authoritative position (reconciling any last-frame
  broadcast/persisted mismatch).
- **Stroke end:** client appends the finished stroke's vector data to
  `room_drawings.strokes` (jsonb array) in one write, not per-point.
- **Object create/resize/rotate/lock/delete:** direct RLS-guarded writes,
  no broadcast tier needed since these aren't high-frequency.
- **Autosave / versioning:** a debounced snapshot job (client-triggered on
  "meaningful pause," e.g. 30s of no object writes, or server-side cron
  Edge Function as a backstop) writes a `room_versions` row with the full
  current `room_objects` set for that room. This is what "restore previous
  version" reads from.

## 5. Media sync (`room:{roomId}:media`)

- Host (or any collaborative-mode member) actions (play/pause/seek/skip)
  write to `media_sessions` (`playback_state`, `position_ms`,
  `current_item_id`, `updated_at`) — this is the authoritative source.
- On any write, a broadcast `{ kind: 'sync_pulse', position_ms, playback_state, server_time }`
  goes out on `room:{roomId}:media` so all clients correct drift
  immediately instead of waiting for the Postgres Changes round-trip.
- Each client also runs a local periodic drift check (~every 10s): compare
  its local player position to `position_ms + (now - updated_at)` and
  reseek if drift exceeds a small threshold (e.g. 1.5s).
- Queue mutations (`media_queue_items` add/remove/reorder) are direct
  persisted writes, fanned out via Postgres Changes — not latency-
  sensitive enough to need a broadcast tier.

## 6. Game sync (`room:{roomId}:game:{sessionId}`)

- Moves are submitted as `game_events` inserts (`event_type: 'move'`,
  `payload`), validated **server-side** by an Edge Function/RPC that
  checks turn legality against `game_sessions.state` before accepting —
  clients never write `game_sessions.state` directly, to prevent a
  malicious client from just declaring itself the winner.
- On acceptance, the function updates `game_sessions.state` and the
  Postgres Changes fan-out delivers the new authoritative state to all
  players/spectators.
- A lightweight broadcast channel carries pure-cosmetic events (opponent's
  cursor while deciding a move, "typing a guess" indicator in Draw &
  Guess) that never affect game outcome.
- Reconnection: a rejoining client fetches current `game_sessions.state` +
  recent `game_events` (for replay/animation context) rather than relying
  on any buffered broadcast.

## 7. Reconnection & backoff

Both the Supabase Realtime client and the LiveKit client independently
implement exponential backoff reconnect (this is standard behavior in both
SDKs, not something we hand-roll). On any channel reconnect, the app
performs a **full resync fetch** for that concern (current `room_objects`,
recent `room_messages`, current `media_sessions`/`game_sessions` state)
before trusting new realtime events — this is the deliberate simplicity
tradeoff called out in [02-architecture.md](02-architecture.md) §5: no
event-buffering/replay protocol, just "reconnect = refetch truth, then
resume streaming."

## 8. Low-bandwidth mode

When the client detects constrained bandwidth (Network Information API on
web; `NWPathMonitor`-derived signal on iOS, or simply LiveKit's own
connection-quality callback), it: drops broadcast throttle rates (e.g.
`object_drag` to ~8 Hz), disables non-essential animations, and can
optionally downgrade LiveKit video to audio-only — this is a client-side
policy layer on top of the same protocol, not a separate protocol.
