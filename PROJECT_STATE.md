# PROJECT_STATE.md — Exact State at Handoff

**Audit timestamp:** 2026-08-06 (initial documentation audit performed this date).
**Checkpoint timestamp:** 2026-08-07 — a second "final transfer checkpoint" session independently re-verified every factual claim below against the live repository (git state, `typecheck`/`lint`/`build`, Vercel deployment status, Vercel env vars, tracked-file secret scan) and resolved a real staleness bug: the 17-file doc system described below as "uncommitted, pending owner decision" had **already been committed** (`b0e446c`, "docs: add full handoff documentation system") by the time this session started — this file, `TASKS.md`, and `CHANGELOG.md` all still described the pre-commit state. Corrected below. See `SESSION_LOG.md`'s 2026-08-07 entry for the full list of what was checked.

This file describes the precise state of the repository as of the checkpoint above. It is meant to let a new session resume from exactly this point with no guessing. Update this file after every meaningful session — overwrite the "current" facts, but consider moving anything historically interesting into `SESSION_LOG.md` or `DECISIONS.md` rather than just deleting it.

---

## Git state

- **Branch:** `main`
- **Latest commit:** `2163b0d` — "Update site favicon to neon sparkle icon" (committed this checkpoint session; see below). Before that, `b0e446c` — "docs: add full handoff documentation system," the commit that landed all 17 memory-system files described in this document.
- **Working tree: clean** as of this checkpoint. At session start there was exactly one uncommitted change — a regenerated `apps/web/src/app/favicon.ico` (binary, pre-existing modification from the project owner, not made by this session). Verified it's a well-formed multi-resolution `.ico` rendering a neon-magenta sparkle on a dark rounded square, consistent with the app's "neon night" theme — committed as `2163b0d`.
- **Remote:** `https://github.com/Gariyuuu/yume.git`, `main` is up to date with `origin/main` as of the last `git fetch` (this checkpoint session did not push).
- **Recent commit history** (newest first, all on `main`, no other active branches detected):

```
2163b0d Update site favicon to neon sparkle icon
b0e446c docs: add full handoff documentation system
638931a Fix: YouTube sync videos never actually played (browser autoplay policy)
adb717f Nav, sign-out, neon theme, custom backgrounds, changelog
2ef8bff Fix: guests (and any brand-new user) could never actually join a room
245e8ba Give the app a real theme: cozy "Your Name"-inspired night sky
fe5cd2e Fix: room creation failed RLS because RETURNING also checks SELECT policy
5af5cf8 Fix: profiles table had no INSERT policy, blocking every first login
e909436 Fix duplicate RLS policy + declare server env vars for Turbo caching
e41b196 Fix: apps/web/.env.example was silently gitignored, never actually committed
b40db49 Phase 7: safety system, room snapshot/share, App Store prep
85912a3 Phase 6: camera effects, game SDK, and three launch games
0aa2867 Phase 5: room chat, YouTube, Spotify, timers, study mode
fb567e4 Phase 4: decoration toolset, drawing layer, notes, templates, autosave
0ef14e5 Checkpoint: save current project progress
622f883 Phase 3: LiveKit voice/video, camera bubbles, screen share, spatial audio
7a989fe Phase 2: monorepo scaffold, auth, rooms, invites, guest join, basic canvas
01a8b69 Phase 1: product, architecture, data model, security, and review docs
```

The pattern is clear from the log: 7 large "build a phase" commits, followed by a burst of small, surgical fix commits once the app was actually deployed and tested live for the first time. **The fix commits are more informative about real bugs than the phase commits** — read those commit messages in full (`git show <hash>`) before assuming any given feature "just works."

---

## Active development objective

**None in progress (no code task).** `DOCS-001` (the 17-file memory system) is fully committed as of `b0e446c` — no open process decision remains. `SEC-001` (RLS gap on `subscription_entitlements`) is the recommended next code task; it is still open. See `TASKS.md`'s "Current task"/"Next up" sections.

## Last completed task

**This checkpoint session (2026-08-07):** a "final transfer checkpoint" pass — re-verified `git status`/`log`/`fetch`, re-ran `typecheck`/`lint`/`build` (all clean), confirmed the live Vercel deployment is Ready in Production and that Supabase/Spotify/YouTube env vars are set (encrypted) on the Vercel project, scanned all tracked files and `docs/phase-1/*` for real secrets (none found — see `SECURITY.md`/below), committed the one pending working-tree change (`favicon.ico`, `2163b0d`), and found + fixed a real staleness bug: this file, `TASKS.md`, and `CHANGELOG.md` still described the 17-file doc system as "uncommitted, awaiting owner decision" when it had already been committed in `b0e446c`. Corrected in all three files.

Before that: the full 17-file documentation/memory-system audit (`CLAUDE.md` through `HANDOFF.md`, plus a `README.md` rewrite) — see `CHANGELOG.md` and `SESSION_LOG.md`'s first 2026-08-06 entry. A same-day follow-up "account-switch checkpoint" session then re-verified `git status`, ran a fresh consistency pass, and corrected a real self-inconsistency found in the audit's own output (the table count was documented as 29 in three files — `CLAUDE.md`, `ARCHITECTURE.md`'s diagram label, `SECURITY.md` — when the real count, cross-checked against every `create table` statement in `supabase/migrations/*.sql`, is 30; the `rate_limit_counters` table had been documented in `DATABASE.md`'s table reference but omitted from the summary count and ER diagram). All now corrected to 30 total / 29 RLS-enabled. Before that: a live-testing hardening pass (room canvas CRUD, chat, notes, timers, full Tic-Tac-Toe flow, drawing layer) and a YouTube autoplay-policy fix (`638931a`) — both verified working against the live Supabase project.

## Current unfinished task

None. `git status` is clean as of this checkpoint. Next recommended work is `TASKS.md`'s `SEC-001`.

## What currently works (verified live, not just assumed)

All of the following were tested via direct HTTP calls against the live Supabase project (`jnercugeinepkgmbxdvn`) using disposable anonymous test accounts, not just read from source:

- Sign-up, profile auto-creation on first login
- Room creation (including the RETURNING-clause RLS fix)
- Guest join via invite link (including the missing-profile fix)
- Room canvas: place/move/delete a decoration object, autosave snapshot insert
- Chat: send, react, soft-delete, image upload to Storage
- Notes and timers: creation
- Games: full Tic-Tac-Toe flow including server-side turn-order enforcement
- Drawing layer: append stroke, toggle lock (with correct `on_conflict` upsert), clear
- Moderation: mute (authorization-rejected correctly for non-moderators), kick (removes membership, writes correctly-joined audit log), ban (blocks a subsequent rejoin attempt with the same identity)
- LiveKit token minting (returns a real, correctly-signed JWT with the right room/identity claims)
- YouTube: database layer (queue/session state) confirmed working; the actual iframe playback bug (browser autoplay policy) was found and fixed

## What has NOT been verified (untested, not necessarily broken)

- **Screen share** — code reviewed and uses correct, standard LiveKit APIs, but no real two-browser WebRTC test has been performed (not possible via API calls alone).
- **Spotify** — the shared database layer (same `media_sessions`/`media_queue_items` tables as YouTube) is implicitly covered by the YouTube test, but the actual OAuth flow + Web Playback SDK have never been exercised with a real Spotify Premium account. The redirect URI for the production domain was flagged as needing manual setup in the Spotify dashboard and was **never confirmed done**.
- **Camera effects** (filters, background blur/replacement, face-tracked accessories, beauty smoothing) — built against MediaPipe's documented API, never visually verified against a live camera.
- **Mobile app** — has never been run through a native build (no Xcode/EAS in this environment). Only Metro bundler-level JS sanity (typecheck) has been done. Camera/LiveKit native modules have never executed on a real device.
- **Multi-person concurrent usage** (2+ real people with camera, screen share, YouTube, and Spotify all active at once) — architecturally sound (independent subsystems), never actually tested with two real humans.
- **Owner-approval invite flow** — known incomplete, not just unverified (see `TASKS.md` `BUG-002`).

## Current blockers

None for continued web development. For iOS shipping: no Apple Developer Program enrollment exists yet (external, non-technical blocker).

## Assumptions currently in effect

- The live Supabase project (`jnercugeinepkgmbxdvn`) is the only environment — there is no staging/local database. Any schema change goes straight to what's effectively production.
- The one real user account in the database (`garywangsmes@gmail.com`) is the project owner's real account, not a test account — do not delete it, do not modify its data without explicit permission.
- `apps/web/.env.local` and `apps/mobile/.env.local` exist on the machine this was developed on with real values (Supabase, LiveKit, Spotify, YouTube) but are gitignored and **not present in a fresh clone**. A new session cloning this repo fresh will need these filled in before `pnpm dev` will work — see `CLAUDE.md` "Environment setup" and each app's `.env.example`.
- Vercel CLI auth and the linked `.vercel/project.json` at repo root reflect a specific developer's local Vercel login — a new machine/account will need to re-link (`vercel link`) before `vercel deploy` works from that machine.

## Temporary decisions on record

- `subscription_entitlements`'s RLS gap was **found and documented, not fixed**, during the original audit — per the explicit instruction that pass should not implement product/behavior changes. It remains the top-priority next code fix, still unverified against the live database this session (no live query was run this checkpoint — see `SECURITY.md` `SEC-001` and `TASKS.md`). Treat it as still open until re-confirmed.
- The 17 documentation files are **committed** (`b0e446c`) — this is no longer an open decision. (Historical note: earlier versions of this file described them as deliberately uncommitted pending owner approval; that was accurate at the time but went stale once the commit landed. Fixed this checkpoint.)

## Next three recommended actions

1. **Fix `SEC-001`**: `alter table subscription_entitlements enable row level security;` in a new migration (e.g. `0022_subscription_entitlements_rls.sql`), following the exact pattern of every prior "found a table with RLS disabled" fix in this project's history (`0006_phase4_rls.sql`, `0016_moderation_rls.sql`). Since nothing reads this table, a minimal "deny all client access, service-role only" policy set (or literally zero policies with RLS enabled) is sufficient and lowest-risk. Re-confirm the gap is still open with a live query before fixing (`select relrowsecurity from pg_class where relname = 'subscription_entitlements'`) — not re-verified this checkpoint session.
2. **Real two-person manual test**: two different humans, two different devices, one Yume room — camera, mic, screen share, YouTube, and Spotify all exercised together. This is the single highest-value remaining verification step and cannot be done via API calls. (Confirming the Spotify redirect URI — `TASKS.md` `CONFIRM-001` — is a prerequisite for the Spotify half of this test.)
3. **Wire up the owner-approval invite flow** (`TASKS.md` `BUG-002`) or explicitly deprioritize it — it's a genuine dead end for any guest who hits `pending_approval`.

## Verification required before continuing

Before starting new feature work, a new session should re-run (all fast, non-destructive):

```bash
cd apps/web && pnpm run typecheck && pnpm run lint && pnpm run build
cd apps/mobile && pnpm run typecheck
```

All four should pass cleanly (they did at this checkpoint, 2026-08-07 — `typecheck` across all 5 workspace packages, `lint` for `apps/web`, and `next build` for `apps/web` all re-run fresh and passed with zero errors/warnings). If any fail, the repository has drifted from this document since the checkpoint — treat this file as stale and investigate before trusting anything else in it.
