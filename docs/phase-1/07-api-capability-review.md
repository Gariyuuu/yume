# 07 — API Capability Review

Per the working rules: **verify each of these against current official
documentation before implementing**, since SDKs and platform policies
change. This review is based on how these platforms work as of this
plan's writing and exists to catch capability mismatches before Phase 2–6
code is written — it is not a substitute for re-checking docs at
implementation time, especially for anything version- or deprecation-
sensitive (flagged explicitly below).

## LiveKit

**What it actually provides:** WebRTC SFU infrastructure — audio/video/
data tracks, room + participant state, server SDKs (Node, and others) for
minting access tokens and managing rooms server-side, client SDKs for web
(`livekit-client`) and React Native (`@livekit/react-native`), screen-
share track publishing, and (on LiveKit Cloud) Egress for recording/
streaming a room and Ingress for bringing external streams in.

**What it does not provide out of the box:** spatial audio. There is no
built-in "distance-based volume" feature — this must be built by the
application, using per-remote-participant volume/gain control (the JS SDK
exposes per-track volume control; the RN SDK's equivalent needs to be
confirmed against current docs) driven by our own distance calculation
from each participant's bubble position in the room. This is called out
explicitly in [02-architecture.md](02-architecture.md) and
[06-feature-parity-matrix.md](06-feature-parity-matrix.md) so it isn't
mistaken for a LiveKit feature we're merely "turning on."

**Verify before Phase 3:** exact per-platform API for remote audio track
volume control, current Egress pricing/availability if used for anything,
and current recommended pattern for background/away audio behavior on iOS
(background audio entitlement + LiveKit RN SDK's guidance for
backgrounding).

## Spotify

**What the Web API + Web Playback SDK actually provide:** Search,
playlists, track/album/artist metadata, and — on **web browsers only** —
in-browser audio playback via the Web Playback SDK, which requires a
Spotify **Premium** account and a user-gesture-initiated session, and
registers the browser tab as a Spotify Connect device.

**What is not available on iOS:** there is no official SDK for streaming
Spotify audio *inside a third-party iOS app*. The iOS-relevant official
tools are the Web API (metadata, search, queue manipulation via Connect)
and the **App Remote SDK**, which can control playback happening in the
separately-installed Spotify app (play/pause/skip/seek on the user's
active Spotify Connect device) but does not pipe audio into our app's UI.
This is a real product constraint, not an implementation gap — it must be
handled as designed in the brief:

- On iOS, "Spotify sync" means: shared queue + track selection + timestamp
  sync work exactly as on web, and playback control commands go to the
  user's Spotify app via App Remote (requires the Spotify app installed;
  falls back to a deep link into the Spotify app if App Remote isn't
  available).
- The room UI shows a current-track card with album art either way; on
  iOS it's explicit that audio is playing in/through the Spotify app, not
  "in-room," with a one-line explanation in the UI per
  [06-feature-parity-matrix.md](06-feature-parity-matrix.md).
- Never implies a native "Spotify Jam" feature unless Spotify's API
  explicitly documents one for third-party apps at implementation time —
  confirm current API surface before building anything that assumes
  multi-device Jam support.

**Verify before Phase 5:** current Web Playback SDK browser support
matrix, current App Remote SDK setup requirements (Spotify Developer
Dashboard app config, bundle ID registration), and current scopes needed
for queue/playlist read + Connect control.

## YouTube

**What the IFrame Player API actually provides:** an embeddable player
controlled via `postMessage`, with play/pause/seek/volume/queue and state-
change events — this is what "web sync" is built on, on both web and iOS
(embedded in a `WKWebView`, since it's fundamentally an iframe/JS API, not
a native SDK call).

**Verify before Phase 5:** Google previously provided a dedicated YouTube
iOS player helper library; confirm its current status (maintained /
deprecated / replaced) before deciding whether to use it versus a plain
`WKWebView` + IFrame API wrapper — this plan defaults to the `WKWebView`
approach as the more durable choice since it doesn't depend on a
possibly-unmaintained native wrapper, but re-check at implementation time.
Also confirm current YouTube API Terms of Service requirements around
embedding/attribution and the "no downloading/rehosting" constraint (which
this plan already treats as a hard rule).

## Supabase

**What it provides (used throughout this plan):** Auth (email/password,
magic link, anonymous sign-in with later linking to a permanent identity),
Postgres with Row Level Security, Realtime (Postgres Changes, Broadcast,
Presence channels), Storage (with RLS-style bucket policies), and Edge
Functions (Deno runtime, for anything needing a service-role key or
server-side authority check).

**Verify before Phase 2:** current anonymous-auth availability/config
requirements on the target Supabase project tier, current Realtime
connection/message-rate limits relevant to a 12-person room's Tier-1
broadcast volume (see [05-sync-protocol.md](05-sync-protocol.md)), and
current Edge Functions cold-start/latency characteristics for the
LiveKit-token-minting path (this sits on the critical path for joining a
room, so latency here is user-facing).

## Apple platform APIs (iOS app)

- **ARKit** (`ARFaceTrackingConfiguration`) — face-tracked accessories on
  devices with a TrueDepth front camera. Confirm minimum supported device
  list against the app's iOS version floor decided in
  [01-prd.md](01-prd.md) §8.
- **Vision framework** — face landmarks and person segmentation
  (`VNGeneratePersonSegmentationRequest`) for background blur/replacement
  without ARKit's TrueDepth requirement, giving broader device coverage
  for that specific feature.
- **Core Image** (`CIFilter`) — color/brightness/contrast/saturation/B&W/
  warm-cool filters, GPU-accelerated.
- **ReplayKit** — in-app screen recording is straightforward
  (`RPScreenRecorder`); full-device screen sharing (sharing *other* apps,
  which is the "screen share" users actually expect on a call) requires a
  **Broadcast Upload Extension** target, which is a separate App Store
  binary component with its own entitlement and setup — this is real
  added App Store submission surface, tracked in
  [09-app-store-risk-review.md](09-app-store-risk-review.md).
- **Metal** — used indirectly via Core Image/AVFoundation compositing for
  effect performance; not something we hand-write shaders for at v1 scope.

## Web platform APIs

- **MediaPipe Tasks Vision** (Face Landmarker, Selfie Segmentation) — WASM,
  runs fully client-side, Apache 2.0 licensed (see
  [08-licensing-review.md](08-licensing-review.md)).
- **Web Audio API** — per-participant `GainNode`/`PannerNode` graph for
  spatial audio, and for local Pomodoro/ambient audio playback.
- **getDisplayMedia** — screen share; audio-with-screen-share support
  varies by browser (verify current Chrome/Safari/Firefox matrix before
  Phase 3 UI copy is written, so we don't promise audio capture where a
  browser can't deliver it).
