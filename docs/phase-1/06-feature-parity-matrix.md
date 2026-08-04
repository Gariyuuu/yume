# 06 — Web / iOS Feature Parity Matrix

Legend: ✅ full parity · ⚠️ partial / different implementation · ❌ not
available on that platform (with reason).

| Feature | Web | iOS | Notes |
|---|---|---|---|
| Email/password + magic-link auth | ✅ | ✅ | Supabase Auth SDK on both |
| Guest join via invite link | ✅ | ✅ | Anonymous auth on both |
| Room canvas rendering | ✅ React Konva | ✅ React Native Skia | Same object model, different renderer — see [02-architecture.md](02-architecture.md) §3 |
| Drag/resize/rotate objects | ✅ | ✅ | Gesture handling differs (pointer events vs. `react-native-gesture-handler`) but same sync protocol |
| Voice chat | ✅ | ✅ | LiveKit on both |
| Video chat / camera bubble | ✅ | ✅ | |
| Screen sharing | ✅ getDisplayMedia | ⚠️ ReplayKit broadcast extension required | iOS needs a broadcast upload extension target; in-app-only (not full-device) screen share is simpler but less useful — plan for full-device via extension, see [07](07-api-capability-review.md) |
| Screen-share audio | ✅ (Chrome/Edge; Safari limited) | ⚠️ via ReplayKit | Browser support for tab/system audio capture varies by browser |
| Spatial audio | ✅ Web Audio API panner/gain per participant distance | ✅ AVAudioEngine 3D mixing | Custom-built on top of LiveKit tracks on both — LiveKit does not provide this natively, see [07](07-api-capability-review.md) |
| Camera filters (color/brightness/etc.) | ✅ Canvas/WebGL | ✅ Core Image | |
| Background blur/replacement | ✅ MediaPipe Selfie Segmentation (WASM) | ✅ Vision framework person segmentation | Both on-device, no upload |
| Face-tracked accessories | ✅ MediaPipe Face Landmarker | ✅ Vision/ARKit face tracking | |
| Drawing layer | ✅ | ✅ | Same vector stroke format, different canvas renderer |
| Room chat | ✅ | ✅ | |
| YouTube sync playback | ✅ IFrame Player API | ⚠️ WKWebView-embedded IFrame player | No native YouTube iOS playback SDK for arbitrary embeds — WebView wrapper is the supported approach, see [07](07-api-capability-review.md) |
| Spotify sync playback | ✅ Web Playback SDK (Premium browser session) | ❌ no in-app playback; opens Spotify app via App Remote/deep link | Real constraint, not an oversight — see [07](07-api-capability-review.md). Track/queue/timestamp sync still works on iOS; audio playback itself happens in the separate Spotify app |
| Study mode / Pomodoro | ✅ | ✅ | Timer logic in shared package, UI per platform |
| Timers | ✅ | ✅ | |
| Shared notes / sticky notes | ✅ | ✅ | |
| Draw & Guess, Trivia, Tic-Tac-Toe/Connect Four | ✅ Phaser or Canvas | ✅ React Native view-based (Phaser/HTML5 canvas not used natively) | Game SDK interfaces shared; rendering implementation is platform-native on iOS rather than an embedded WebView game, for performance and app-review cleanliness |
| Room snapshot capture | ✅ Canvas `toDataURL`/`toBlob` | ✅ native view snapshot (`UIGraphicsImageRenderer` via RN) | |
| Share to Instagram/TikTok | ✅ Web Share API where supported (Safari/iOS Safari; limited on desktop Chrome) | ✅ native share sheet | Web fallback: "save image, open app" when Web Share API unavailable |
| Push notifications | ⚠️ Web Push where supported | ✅ APNs | Web Push has real gaps on iOS Safari depending on OS version; not a blocker for v1 since in-room presence is the primary signal |
| Picture-in-picture (YouTube) | ✅ | ✅ iOS PiP API | |
| Background/away app state | ⚠️ tab visibility API | ✅ app state + background audio entitlement for voice-only | iOS can keep voice-only LiveKit connection alive in background with the right entitlement; web tab backgrounding is best-effort |

## Implementation implication

Anywhere this table shows ⚠️ or ❌, the UI must communicate the limitation
in-product (e.g., "Spotify playback opens in the Spotify app on iOS" copy
near the Spotify panel) rather than silently degrading — this is called
out explicitly in the brief ("explain the limitation clearly") and is a
launch requirement, not a nice-to-have.
