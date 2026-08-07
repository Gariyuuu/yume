# FEATURES.md — Feature-by-Feature Status

Status classifications used below: **Verified complete** (live-tested end to end), **Mostly complete** (built fully, spot-checked or code-reviewed but not exhaustively live-tested), **Partially implemented**, **UI only**, **Backend only**, **Mocked**, **Planned**, **Broken**, **Unable to verify**.

---

## Authentication & accounts

- **Purpose:** Let users create an account (or join as a guest) and stay signed in.
- **User flow:** Sign up with email/password → confirm email → sign in. Or: click an invite link → type a display name → join as an anonymous guest, no account needed.
- **Status: Verified complete** (sign-up, profile auto-creation, guest join all live-tested; sign-out was found broken — button never wired — and fixed).
- **Frontend:** `apps/web/src/app/(auth)/*`, `apps/mobile/src/screens/AuthScreen.tsx`.
- **Backend:** Supabase Auth (email/password, magic link, anonymous). Profile row created lazily on first use (`requireProfile()` / `ensureProfile()` / `join-room` Edge Function).
- **Database:** `profiles` table, `auth.users` (Supabase-managed).
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`, `EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY`.
- **Permissions:** none beyond being authenticated.
- **Known issues:** none currently open (the missing-profile-on-first-join bug and the missing sign-out button were both found and fixed this session — see `DECISIONS.md`).

## Rooms (create, list, join)

- **Purpose:** A room is the persistent private space a group of friends shares.
- **User flow:** Create a room from `/rooms` → optionally pick a decoration template → invite friends via a generated link.
- **Status: Verified complete.**
- **Frontend:** `apps/web/src/app/rooms/*`, `apps/web/src/app/room/[roomId]/page.tsx`.
- **Backend:** Direct RLS-scoped inserts. `handle_new_room()` trigger auto-creates the owner's `room_memberships` row (security definer, since a brand-new room has no members yet to grant that insert via normal RLS).
- **Database:** `rooms`, `room_memberships`, `room_templates`.
- **Known issues:** none open. **Historically:** room creation was completely broken (RLS RETURNING interaction) and fixed — see `DECISIONS.md` for the exact mechanism, since it's a non-obvious class of bug worth knowing about for any future `.insert().select()` call.

## Invites & guest join

- **Purpose:** Share a room with friends via a link; supports password, expiry, max-uses, and (incompletely) owner-approval gating.
- **Status: Mostly complete.** Password/expiry/max-uses/rate-limiting/ban-check: verified complete. **Owner-approval mode: Broken** — a guest requesting to join a `requires_owner_approval` invite gets stuck at `pending_approval` permanently; there is no UI anywhere for an owner to approve them. This has been a known, undocumented-to-the-user gap since Phase 2.
- **Frontend:** `apps/web/src/app/invite/[token]/*`, `apps/web/src/app/room/[roomId]/invite-dialog.tsx` (create + revoke).
- **Backend:** `supabase/functions/join-room/index.ts` — the entire invite-validation and join logic lives here (token lookup, password check, ban check, room-lock check, rate limit, lazy profile creation, membership insert).
- **Database:** `room_invites`, `room_bans`.
- **Known issues:** `BUG-002` (owner-approval flow) in `TASKS.md`.

## Voice & video calls (LiveKit)

- **Purpose:** Real-time voice/video with draggable camera bubbles and distance-based spatial audio.
- **Status: Mostly complete.** Token minting verified live (returns a real, correctly-signed token). Actual WebRTC audio/video/screen-share has **never been tested with two real browsers** — code review only, using standard documented LiveKit APIs.
- **Frontend:** `apps/web/src/components/call/*`, `apps/mobile/src/components/CallView.tsx`.
- **Backend:** `supabase/functions/mint-livekit-token/index.ts`.
- **External:** LiveKit Cloud (`wss://yume-p9t15gah.livekit.cloud` — a real, connected project).
- **Env vars (Edge Function secrets, not app env):** `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
- **Spatial audio:** custom-built on LiveKit's per-track `setVolume()` (LiveKit has no native spatial audio) — distance between bubble positions maps to volume. Code-reviewed, not live-verified with real audio.
- **Known issues:** No real multi-browser test performed (`TASKS.md` `TEST-001`).

## Screen sharing

- **Purpose:** Share your screen with the room.
- **Status: Unable to verify (code looks correct).** Uses `@livekit/components-react`'s standard `useTrackToggle({source: Track.Source.ScreenShare})` and `useTracks`/`VideoTrack` for display — textbook LiveKit usage, no custom/fragile code. Supports multiple simultaneous screen-shares (the display component already `.map()`s over all active screen-share tracks). No real getDisplayMedia()-permission browser test has been done.
- **Frontend:** `apps/web/src/components/call/call-controls.tsx` (toggle), `screen-share-strip.tsx` (display).
- **Known issues:** untested, `TASKS.md` `TEST-001`.

## Camera effects (web only)

- **Purpose:** On-device filters, background blur/replacement, face-tracked accessories, frames, restrained beauty smoothing — all client-side, no raw footage ever uploaded.
- **Status: Mostly complete, one sub-feature unverified.** The pipeline (MediaPipe FaceLandmarker + ImageSegmenter, canvas compositing, LiveKit track publishing) is real and typechecks/builds. **Face-tracked accessories specifically have never been visually tuned against a live camera** — the landmark-index math is written against MediaPipe's documented indices but could be visually wrong (misplaced glasses/hat/mask) in practice.
- **Frontend:** `apps/web/src/lib/camera-effects/*`, `apps/web/src/components/camera-effects/*`.
- **Mobile:** **Not implemented** — no equivalent pipeline exists (no on-device Vision/Core Image module built for React Native). This is a deliberate, documented scope cut, not an oversight.
- **Known issues:** face-accessory visual accuracy unverified.

## Room decoration canvas

- **Purpose:** Drag-and-drop furniture/rugs/plants/etc. onto a shared room canvas; multi-select, resize, rotate, layer, lock, undo/redo.
- **Status: Verified complete** (web — object create/move/delete/autosave all live-tested). **Mobile: Partially implemented** (single-object drag, tap-hold-delete only — no multi-select/resize/rotate/layering/snap-to-grid, deliberately scoped down and documented as such in-code).
- **Frontend:** `apps/web/src/components/room-canvas/*` (Konva), `apps/mobile/src/components/RoomCanvasView.tsx` (Skia).
- **Database:** `room_objects`, `room_versions` (autosave snapshots), `room_assets`, `asset_licenses`.
- **Known issues:** decoration art is placeholder (7 hand-authored SVGs, not a real Kenney import — see `ASSET_LICENSES.md`).

## Room templates

- **Purpose:** Start a new room pre-decorated (Cozy bedroom, Study café, Movie room, Gaming room, Music lounge, Picnic, Blank canvas, Seasonal room).
- **Status: Verified complete.** 8 templates exist in `supabase/seed.sql` and were confirmed applied to the live database (this was itself a real gap found and fixed this session — the seed file existed since Phase 4 but had never been run against the live project until it was noticed the template picker only showed "Blank canvas").
- **Database:** `room_templates`.
- **Known issues:** none currently — but if a fresh Supabase project is ever provisioned, remember `seed.sql` is **not** auto-applied by `db push` and must be run by hand.

## Drawing layer

- **Purpose:** A shared freehand drawing layer over the room (pen/highlighter/eraser, live cursors, lock, clear, export as PNG).
- **Status: Verified complete** (append-stroke RPC, lock-toggle upsert, clear-layer RPC all live-tested).
- **Frontend:** `apps/web/src/components/drawing/*`.
- **Backend:** `append_drawing_stroke`/`clear_drawing_layer` Postgres RPC functions (`supabase/migrations/0008_drawing_functions.sql`).
- **Database:** `room_drawings` (one row per room, `strokes` JSONB array, `layer_locked` boolean).
- **Mobile:** **Not implemented.**

## Shared notes

- **Purpose:** Sticky notes / checklists / text notes on the room canvas, owner-only or everyone-editable.
- **Status: Verified complete** (creation live-tested).
- **Frontend:** `apps/web/src/components/notes/*`.
- **Database:** `room_notes`.
- **Mobile:** **Not implemented.**

## Timers

- **Purpose:** Shared or personal countdown/stopwatch/pomodoro/event-countdown timers with a synthesized Web Audio alarm.
- **Status: Verified complete** (creation live-tested).
- **Frontend:** `apps/web/src/components/timers/*`.
- **Database:** `timers`.
- **Mobile:** **Not implemented.**

## Study mode

- **Purpose:** Synced Pomodoro sessions, focus status, do-not-disturb, streak tracking, synthesized ambient noise, a personal (localStorage-only) checklist.
- **Status: Mostly complete** (built fully; not specifically live-tested this pass, but uses the same verified patterns as timers/presence).
- **Frontend:** `apps/web/src/components/study/*`.
- **Database:** `study_sessions`, `study_focus_logs`; reuses the `presence_status` enum's `studying` value and a `doNotDisturb` presence flag.
- **Note:** ambient noise is **synthesized white/brown noise**, not licensed lo-fi music tracks — a deliberate, documented substitution (no licensing available for real tracks).
- **Mobile:** **Not implemented.**

## Room chat

- **Purpose:** Persistent slide-in chat panel — messages, replies, reactions, @mentions, image uploads.
- **Status: Verified complete** (send/react/soft-delete/image-upload all live-tested).
- **Frontend:** `apps/web/src/components/chat/*`, `apps/mobile/src/components/ChatModal.tsx` (mobile: text/reactions/delete only, no @mentions/image-upload/search).
- **Database:** `room_messages`, `message_reactions`. Storage: `uploads` bucket.
- **Known issues:** mobile is a real but thinner slice (documented, not accidental).

## YouTube watch-together

- **Purpose:** Paste a link or search, queue videos, synced playback across the room.
- **Status: Verified complete (after a real fix).** Database/queue layer was always solid; **actual playback was broken for anyone who didn't personally just click something**, due to a browser autoplay-policy interaction with realtime-sync-triggered `playVideo()` calls. Fixed: player now starts muted (browsers always allow muted autoplay) with a visible unmute button.
- **Frontend:** `apps/web/src/components/youtube/*`, `apps/web/src/lib/youtube.ts`.
- **Backend:** `apps/web/src/app/room/[roomId]/youtube-actions.ts` (search only, needs `YOUTUBE_API_KEY`).
- **Database:** `media_sessions` (provider='youtube'), `media_queue_items`.
- **Known issues:** none currently open. Mobile: **not implemented.**

## Spotify sync

- **Purpose:** Shared Spotify queue, synced across the room's connected Premium members.
- **Status: Unable to verify (OAuth/SDK layer).** The shared database layer (`media_sessions`/`media_queue_items`, same tables as YouTube) is implicitly verified by the YouTube test. The actual OAuth connect flow and Web Playback SDK have **never been exercised with a real Spotify account** in this environment. **The production redirect URI was flagged as needing manual setup in the Spotify Developer Dashboard and was never confirmed done** — if Spotify connect fails with a redirect-mismatch error, this is almost certainly why.
- **Frontend:** `apps/web/src/components/spotify/*`.
- **Backend:** `apps/web/src/app/spotify/connect|callback/route.ts`, `apps/web/src/app/room/[roomId]/spotify-actions.ts`.
- **Database:** `spotify_connections` (OAuth tokens, own-row RLS only), `media_sessions`/`media_queue_items` (provider='spotify').
- **Env vars:** `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` (both real values are configured in Vercel).
- **Important product constraint (not a bug):** there is no real shared audio stream — each connected Premium member's browser is its own independent Spotify Connect device, all told to play the same track/position. This is a genuine API limitation, documented in-code, not something to "fix."
- **Mobile:** **Not implemented.**

## Games — Tic-Tac-Toe

- **Purpose:** 2-player Tic-Tac-Toe with server-validated moves.
- **Status: Verified complete on both platforms.** Full flow (create/join/ready/start/move, including correct turn-order rejection) live-tested on web's dispatch path; the mobile Edge Function path uses duplicated-but-equivalent logic (see `FILE_MAP.md` "Games").
- **Frontend:** `apps/web/src/components/games/tic-tac-toe-board.tsx`, `apps/mobile/src/components/TicTacToeBoard.tsx`.
- **Backend:** `apps/web/src/app/room/[roomId]/games/tic-tac-toe-actions.ts` + `game-dispatch.ts` (web), `supabase/functions/game-actions/index.ts` (mobile).
- **Database:** `game_sessions`, `game_players`, `game_events`.

## Games — Trivia

- **Purpose:** 5-round trivia with a server-only question bank (30 original questions).
- **Status: Mostly complete** (built fully, uses the same verified `game-dispatch.ts` choke point as Tic-Tac-Toe; not individually live-tested this pass).
- **Frontend:** `apps/web/src/components/games/trivia-board.tsx`.
- **Backend:** `apps/web/src/app/room/[roomId]/games/trivia-actions.ts`, `trivia-questions.ts` (`import "server-only"` — answers never reach the client bundle).
- **Mobile:** **Not implemented** (needs the question bank duplicated into a Deno-callable form; deliberately deferred).

## Games — Draw & Guess

- **Purpose:** 6-round drawing/guessing game with a server-only word bank, live Konva drawing canvas synced via ephemeral Broadcast (strokes are never persisted to a table).
- **Status: Mostly complete** (built fully; not individually live-tested this pass).
- **Frontend:** `apps/web/src/components/games/draw-and-guess-board.tsx`, `draw-and-guess-canvas.tsx`, `use-draw-and-guess-canvas.ts`.
- **Backend:** `apps/web/src/app/room/[roomId]/games/draw-and-guess-actions.ts`, `draw-and-guess-words.ts` (`import "server-only"`).
- **Database:** the secret word lives in `game_round_secrets` — a table with RLS enabled and **zero client policies at all** (service-role only), specifically because Postgres RLS can't hide one field from some readers of a row while showing it to others on that same row.
- **Mobile:** **Not implemented** (needs both the word bank and a canvas layer mobile doesn't have).

## Moderation & safety (kick/ban/mute/report/block/lock)

- **Purpose:** Room owners/moderators can mute, kick, ban, lock the room; any member can report content or block another user.
- **Status: Verified complete.** Mute (authorization rejection), kick (membership removal + audit log), and ban (blocks subsequent rejoin) all live-tested end to end, including the rank check (moderator can't target owner/another moderator).
- **Frontend:** `apps/web/src/components/moderation/*`, `apps/web/src/components/call/participant-bubble.tsx` (menu), `apps/mobile/src/components/ParticipantMenu.tsx`.
- **Backend:** `supabase/functions/moderate-participant/index.ts` (mute/kick/ban), `apps/web/src/app/room/[roomId]/moderation-actions.ts` (report/lock/block — plain RLS).
- **Database:** `room_bans`, `reports`, `user_blocks`, `audit_logs`.
- **Rate limiting:** join attempts, invite creation, report submission, and guest chat messages are all rate-limited via a shared `check_rate_limit()` Postgres function — verified present in migrations, not separately load-tested.
- **Known issues:** none open.

## Room snapshot & sharing

- **Purpose:** Capture a shareable image of the room (decoration only by default, opt-in to include camera bubbles), export vertical/square/original, share via native share sheet / Web Share API.
- **Status: Mostly complete** (built fully against real, verified browser/Skia APIs; not live-tested this pass since it requires actual camera permission + a visual check).
- **Frontend:** `apps/web/src/components/room-canvas/snapshot-dialog.tsx` (web, Konva `toDataURL()` + optional canvas-composited camera frames), `apps/mobile/src/lib/snapshot.ts` (mobile, Skia `makeImageSnapshot()` + `expo-sharing`).
- **Known issues:** mobile version has no camera-compositing option (no cheap way to draw a react-native-webrtc view into a Skia surface) — documented, deliberate.

## Custom page backgrounds

- **Purpose:** Upload your own background image, applied app-wide for just you.
- **Status: Mostly complete** (built and typechecked; the upload/apply mechanism was not independently live-tested this pass, though it uses the same verified Storage-upload pattern as chat images).
- **Frontend:** `apps/web/src/app/settings/background-upload.tsx`, `apps/web/src/components/starfield.tsx` (applies it).
- **Database:** `profiles.background_url`. Storage: `user-backgrounds` bucket.

## Data export & account deletion

- **Purpose:** GDPR-style "download my data" and full account deletion, reachable from both web and mobile Settings.
- **Status: Mostly complete.** Export covers `profile`, `room_memberships`, `owned_room_objects` — explicitly flagged in its own code comment as needing extension to cover `room_messages`/`room_notes`/etc. Deletion calls a real Edge Function. Neither has been live-tested this pass.
- **Frontend:** `apps/web/src/app/settings/export/route.ts`, `apps/web/src/app/settings/danger-zone.tsx`, `apps/mobile/src/screens/SettingsScreen.tsx`.
- **Backend:** `supabase/functions/delete-account/index.ts`.
- **Why mobile Settings exists at all:** built specifically because Apple App Store Guideline 5.1.1(v) requires account deletion to be reachable from inside the app, not a web-only flow — this wasn't just a nice-to-have.

## Privacy policy / terms / changelog pages

- **Purpose:** Legal pages + an in-app changelog.
- **Status: Verified complete as pages** (they render; content accuracy is not lawyer-reviewed for `/privacy` and `/terms` — explicitly labeled as such on the pages themselves).
- **Frontend:** `apps/web/src/app/privacy/page.tsx`, `terms/page.tsx`, `changelog/page.tsx`.

## Premium tier / entitlements

- **Purpose:** Infrastructure for a future paid tier, deliberately inactive at launch per the original product brief.
- **Status: Planned / schema-only.** The `subscription_entitlements` table exists in the schema (`0001_init.sql`) but **has zero application code referencing it anywhere** (verified via full-repo grep) and **has RLS disabled** (a live security gap — see `SECURITY.md` `SEC-001`). There is no `is_premium()` helper function or equivalent gating logic anywhere in the codebase, despite the original plan referencing one.
- **Known issues:** RLS gap (`SEC-001`), otherwise correctly inactive/unbuilt as intended.

## Website ad system

- **Purpose:** Infrastructure for a future ad system, deliberately inactive at launch.
- **Status: Not built at all.** No trace of any ad-related code, table, or component found anywhere in the repository. The original brief mentions this as planned infrastructure; it does not appear to have been started.
