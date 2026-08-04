# 01 — Product Requirements

## 1. Vision

A persistent virtual room where a small group of close friends (2–12 people)
can drop in, see each other as movable bubbles, talk, decorate a shared space
over time, and use it as a lightweight hangout/study spot. Optimized for
**intimacy and continuity** (the room remembers you), not scale or public
discovery.

Positioning: simpler, cuter, cleaner, and easier to use than the general
category Here.fm occupied. Nothing in this repo — code, art, copy, layout —
is copied from Here.fm; only the high-level concept ("persistent room +
bubble avatars + friends") is shared, which is an unprotectable idea, not
their expression of it.

## 2. Target users

- Friend groups who already voice-chat elsewhere (Discord, FaceTime) and want
  a shared "place" instead of a call.
- Studying/co-working pairs or small groups who want body-doubling with
  ambient presence.
- Long-distance friend groups who want a space that persists between visits
  (unlike a Zoom call that resets to nothing).

Non-targets for v1: public communities, large servers, professional/work
meetings, content creators broadcasting to audiences.

## 3. Platforms

| Platform | v1 | Notes |
|---|---|---|
| Responsive website | Yes | Next.js, primary iteration surface |
| iPhone (App Store) | Yes | React Native |
| Android | No | Explicitly excluded from v1 |
| iPad-optimized layout | Nice-to-have | Same RN codebase, not a launch blocker |

Pricing: free, ad-free at launch. No paid decorations, no locked essential
features. Entitlement infrastructure is built (Phase 2+) but no paywall is
turned on.

## 4. Core loop

1. Create a room → pick a template → land in an editable, empty-ish room.
2. Decorate it (drag in furniture/rugs/posters from the asset library).
3. Invite friends via a link (expiring, optionally password-protected).
4. Friends join as an account or a temporary guest.
5. Everyone talks/video-chats, moves their bubble around, draws, watches
   YouTube, listens to Spotify together, studies with a shared Pomodoro, or
   plays a small game.
6. Room state autosaves continuously.
7. Anyone returns later and the room is exactly as they left it.

## 5. Feature scope by priority

This restates the full feature spec into MoSCoW buckets for sequencing. It
does not drop anything — everything listed as "Required" in the original
spec is Must/Should for v1; nothing is cut, only ordered. See
[11-implementation-checklist.md](11-implementation-checklist.md) for the
phase-by-phase build order (Phase 2 → 7 from the original brief).

**Must have for v1 (Phases 2–5):**
Auth (email/password + magic link), profiles, rooms, invite links + guest
join, roles/permissions, persistent room canvas with decoration + autosave +
undo/redo + versioning, LiveKit voice/video, camera bubbles, screen share,
presence, spatial audio, drawing layer, room chat, YouTube sync, Spotify
sync (with the iOS constraint disclosed in
[07-api-capability-review.md](07-api-capability-review.md)), timers, study
mode.

**Must have before App Store submission (Phase 6–7):**
Camera filters/effects (on-device only), 3 launch games (Draw & Guess,
Trivia, Tic-Tac-Toe/Connect Four) + game SDK, snapshots/sharing, safety
tooling (kick/ban/block/report/rate limits), accessibility pass, App Store
compliance artifacts.

**Explicitly deferred (not cut, just not v1):**
Premium tier activation (infra built, paywall off), website ad system
(infra built, not activated), public room discovery (not built at all —
against the "small private groups" positioning), Android app, additional
games beyond the 3 launch titles.

## 6. Non-goals

- Not a Discord replacement (no DM system, no multi-server model).
- Not a public social network (no discovery, no public profiles searchable
  outside a room).
- Not a broadcast/streaming platform for large audiences.
- Not a general-purpose whiteboard tool (drawing is embedded in the room,
  not a standalone Excalidraw clone).
- Not a music/video hosting service (both YouTube and Spotify integrations
  are strictly official-API pass-throughs — see
  [07-api-capability-review.md](07-api-capability-review.md)).

## 7. Success signals (v1)

Since this is a pre-launch plan, success is defined qualitatively for now:

- A group of 2–12 friends can create a room, decorate it, and have a >30
  minute session with voice + at least one activity (drawing, YouTube,
  Spotify, or a game) without a crash or unrecoverable desync.
- Returning to a room after a week shows the exact same layout.
- A guest can join from a cold link (no account) in under 30 seconds.
- App Store review passes without a UGC/moderation rejection.

## 8. Open product questions (need a decision before Phase 2 starts)

These are flagged, not blocking Phase 1 docs, but should be resolved before
writing code:

1. Final product name/branding (currently "Yume" placeholder everywhere).
2. Minimum iOS version target (recommend iOS 16+ for modern
   ReplayKit/Vision APIs — confirm against current Xcode/App Store minimums
   before Phase 2).
3. Whether guest accounts can ever be upgraded to full accounts in-place
   (recommended: yes, via Supabase anonymous-auth → permanent user linking).
4. LiveKit Cloud vs. self-host timeline — this plan assumes LiveKit Cloud
   for v1 with a portable architecture (see
   [02-architecture.md](02-architecture.md)).
