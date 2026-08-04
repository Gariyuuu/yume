# 11 — Implementation Checklist

Mirrors the build order from the brief. Nothing here is optional-cut;
premium/ads items are explicitly "build the plumbing, leave it off."

## Phase 2 — Foundation

- [ ] Turborepo + pnpm workspace scaffold (`apps/web`, `apps/mobile`,
      `packages/*`) per [10-folder-structure.md](10-folder-structure.md)
- [ ] Supabase project provisioned; `0001_init.sql` + `0002_rls.sql`
      applied; remaining tables' RLS policies written following the
      `room_role()` pattern in [04-security-rls.md](04-security-rls.md)
- [ ] Auth: email/password, magic link, anonymous (guest) sign-in +
      account linking
- [ ] Profiles: display name, avatar, status
- [ ] Rooms: create, rename, delete, room_templates seed data (system
      templates: cozy bedroom, study café, movie room, gaming room, music
      lounge, picnic, blank canvas, seasonal)
- [ ] Invitations: create/revoke link, expiry, password, capacity,
      `join-room` Edge Function per
      [04-security-rls.md](04-security-rls.md) §2–3
- [ ] Guest joining end-to-end (cold link → temp name/avatar → in room)
- [ ] Roles/permissions: owner/moderator/member/guest, membership
      management UI
- [ ] Basic persistent room canvas: render `room_objects`, add/move/
      delete, Tier-2 persistence only (Tier-1 broadcast comes with
      Phase 3/4 polish, not required to prove the model out)

## Phase 3 — Real-time presence & media

- [ ] LiveKit Cloud project; `mint-livekit-token` Edge Function per
      [04-security-rls.md](04-security-rls.md) §7
- [ ] Voice chat, mute/unmute, device selection
- [ ] Video chat, camera on/off
- [ ] Camera bubble: video-when-on / avatar-when-off, speaking animation,
      muted/camera-off/network-quality badges
- [ ] Screen sharing — web (`getDisplayMedia`); iOS broadcast extension
      target per [09-app-store-risk-review.md](09-app-store-risk-review.md) §4
- [ ] Presence channel + status (online/away/busy/studying/offline) per
      [05-sync-protocol.md](05-sync-protocol.md) §2
- [ ] Spatial audio (custom Web Audio / AVAudioEngine gain-by-distance) +
      room-wide non-spatial toggle
- [ ] Host mute controls, participant volume controls
- [ ] Recording/permission indicators visible whenever mic/camera/screen
      is active

## Phase 4 — Decoration & collaboration surfaces

- [ ] Tier-1 broadcast channel (`room:{roomId}:live`) for drag/cursor per
      [05-sync-protocol.md](05-sync-protocol.md) §3
- [ ] Full decoration toolset: add/move/resize/rotate/duplicate/layer/
      delete, multi-select, snap-to-grid + free placement, lock/unlock,
      send-backward/bring-forward
- [ ] Undo/redo
- [ ] Autosave + `room_versions` snapshotting + restore UI
- [ ] Kenney asset import batch 1 with `ASSET_LICENSES.md` +
      `asset_licenses` rows per [08-licensing-review.md](08-licensing-review.md)
- [ ] Room templates: browse, apply, save-as-custom-template
- [ ] Drawing layer: pen/highlighter/eraser/shapes/arrows/text/color/
      stroke size/undo-redo/clear-with-confirm/lock/export, per-user
      cursors
- [ ] Shared notes: sticky/checklist/text, color, lock, pin, owner-only vs
      everyone-can-edit

## Phase 5 — Chat, media, study

- [ ] Room chat: messages, reactions, replies, mentions, image/GIF share,
      link previews, deletion, host moderation, search, unread count
- [ ] YouTube: search/paste URL, shared queue, playback controls, host-only
      vs collaborative mode, drift correction per
      [05-sync-protocol.md](05-sync-protocol.md) §5, fullscreen + PiP
- [ ] Spotify: OAuth connect/disconnect/reauthorize, search, shared queue,
      web playback, iOS App Remote hand-off + in-UI limitation messaging
      per [07-api-capability-review.md](07-api-capability-review.md)
- [ ] Timers: countdown/stopwatch/pomodoro/event countdown, shared vs
      personal, alarm sound, host permissions
- [ ] Study mode: shared Pomodoro, configurable durations, sync start/
      pause/reset, individual focus status, shared + personal checklists,
      lo-fi/ambient audio (licensed sources only), do-not-disturb, session
      duration tracking, streaks, reminders

## Phase 6 — Effects & games

- [ ] Camera effects pipeline (on-device only, per
      [07-api-capability-review.md](07-api-capability-review.md)): color
      filters, brightness/contrast/saturation, B&W, warm/cool, background
      blur, background replacement, frames, stickers, face-tracked
      accessories, simple masks, restrained-default beauty smoothing
- [ ] Effect-plugin interface so new lenses can be added without touching
      core camera pipeline code
- [ ] `packages/game-sdk` interfaces: session lifecycle, invite/ready/
      spectate/turn-sync/reconnect/score/rematch/leave contract
- [ ] Draw & Guess (with drawing-layer reuse from Phase 4 where sensible)
- [ ] Trivia
- [ ] Tic-Tac-Toe / Connect Four
- [ ] Server-side move validation for all three (per
      [05-sync-protocol.md](05-sync-protocol.md) §6) — no client-trusted
      win conditions
- [ ] Game-specific chat/reactions, mobile + web layouts

## Phase 7 — Sharing, safety, App Store

- [ ] Room snapshot capture (controls hidden, camera-visibility toggle),
      vertical/square export, native share sheet (iOS) + Web Share API
      with save-and-open fallback (web)
- [ ] Safety: kick, ban, block, report, room lock, invite revocation
      (already covered structurally by Phase 2 tables, wire up full UI),
      content removal, moderation log (`audit_logs` UI), rate limits on
      join/invite/report/message endpoints, upload scanning + file-type/
      size restrictions
- [ ] Accessibility pass: keyboard navigation (web), VoiceOver labels
      (iOS), color-contrast check on chat/chrome, captions/indicators for
      audio-only cues (speaking indicator must not be color-only)
- [ ] App Store prep per [09-app-store-risk-review.md](09-app-store-risk-review.md):
      permission strings, privacy manifest, privacy policy, terms, support
      URL, in-app account deletion (verify reachable, not just
      implemented), data export, TestFlight config, icons/launch screens/
      screenshots, review notes + demo/guest instructions

## Cross-cutting (spans every phase)

- [ ] Feature-flag/entitlement plumbing: `subscription_entitlements`
      reads gate nothing at launch (`is_premium()` always returns
      `false`-equivalent behavior for now) but the check exists everywhere
      a future premium feature would need it
- [ ] Website ad-placement system built but inactive; verify it can never
      render over video/chat/screen-share/private content once turned on,
      per the brief's constraints, even though it's off
- [ ] Tests per [testing section of the brief] added alongside each
      phase's features, not deferred to the end: unit, integration, E2E
      web, iOS UI, multi-user room simulation, network-disconnect,
      permission/RLS, media-sync, room-state-conflict, screen-share,
      guest-access, abuse/rate-limit
- [ ] Lint + typecheck + test run after every phase, per working rules
