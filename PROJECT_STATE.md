# PROJECT_STATE.md — Exact State at Handoff

**Audit timestamp:** 2026-08-06 (initial documentation audit performed this date).
**Checkpoint timestamp:** 2026-08-06, same day — a follow-up "account-switch checkpoint" session independently re-verified every factual claim below against the live repository (git state, migration count, table/RLS count via fresh `grep` over `supabase/migrations/*.sql`, edge function count, package version pins, and a full re-run of `typecheck`/`lint`/`build`) before handing off to a new Claude Code account. Everything checked out unchanged — no drift found, no corrections were needed. See `SESSION_LOG.md`'s second 2026-08-06 entry for the full list of what was checked.

This file describes the precise state of the repository as of the checkpoint above. It is meant to let a new session resume from exactly this point with no guessing. Update this file after every meaningful session — overwrite the "current" facts, but consider moving anything historically interesting into `SESSION_LOG.md` or `DECISIONS.md` rather than just deleting it.

---

## Git state

- **Branch:** `main`
- **Latest commit:** `638931a` — "Fix: YouTube sync videos never actually played (browser autoplay policy)" (unchanged since the documentation audit began — **no commit has been made this session or the checkpoint session**).
- **Working tree: NOT clean.** `README.md` is modified (unstaged) and 16 new documentation files are untracked. This is expected, intentional state from the documentation-handoff audit — **not** a sign of interrupted work. Full list:
  ```
  Changes not staged for commit:
      modified:   README.md

  Untracked files:
      API_REFERENCE.md   ARCHITECTURE.md   CHANGELOG.md   CLAUDE.md
      DATABASE.md         DECISIONS.md      DEPLOYMENT.md  FEATURES.md
      FILE_MAP.md          HANDOFF.md        PROJECT_STATE.md
      ROADMAP.md            SECURITY.md        SESSION_LOG.md
      TASKS.md               TESTING.md          UI_SYSTEM.md
  ```
  **None of this has been committed, pushed, or otherwise applied to git history.** Per explicit instruction, no commit/push/reset/deploy action has been taken on the user's behalf — committing these files is a decision left to the project owner (or a future session explicitly instructed to do so). See "Next three recommended actions" below.
- **Remote:** `https://github.com/Gariyuuu/yume.git`, `main` is up to date with `origin/main` (the divergence above is entirely local, uncommitted working-tree state, not a branch/remote mismatch).
- **Recent commit history** (newest first, all on `main`, no other active branches detected):

```
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

**None in progress (no code task).** The one open item is a **documentation/process decision, not a coding task**: whether to commit the 17 new/updated memory-system files described above. No feature work, bug fix, or refactor is in flight. See `TASKS.md`'s "Current task" section for the full detail the account-switch checkpoint requires (objective/completed/remaining/files/blockers/acceptance criteria/verification steps).

## Last completed task

The full 17-file documentation/memory-system audit (`CLAUDE.md` through `HANDOFF.md`, plus a `README.md` rewrite) — see `CHANGELOG.md`'s "[Unreleased] — Documentation handoff audit" entry and `SESSION_LOG.md`'s first 2026-08-06 entry. A same-day follow-up "account-switch checkpoint" session then re-verified `git status`, ran a fresh consistency pass, and corrected a real self-inconsistency found in the audit's own output (the table count was documented as 29 in three files — `CLAUDE.md`, `ARCHITECTURE.md`'s diagram label, `SECURITY.md` — when the real count, cross-checked against every `create table` statement in `supabase/migrations/*.sql`, is 30; the `rate_limit_counters` table had been documented in `DATABASE.md`'s table reference but omitted from the summary count and ER diagram). All now corrected to 30 total / 29 RLS-enabled. Before that: a live-testing hardening pass (room canvas CRUD, chat, notes, timers, full Tic-Tac-Toe flow, drawing layer) and a YouTube autoplay-policy fix (`638931a`) — both verified working against the live Supabase project.

## Current unfinished task

None code-wise. The only unfinished item is the commit decision noted above under "Active development objective" — this is a **process/ownership decision, not unfinished work**. If a new session is picking this up, run `git status` first: if it shows the same 17 doc files as described here, that matches this file's description and is expected; if it shows something different, this file is stale relative to reality and should be treated with suspicion until reconciled.

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

- `subscription_entitlements`'s RLS gap was **found and documented, not fixed**, during the audit — per the explicit instruction that this audit pass should not implement product/behavior changes. It is the top-priority next code fix. See `SECURITY.md` `SEC-001` and `TASKS.md`.
- **The 17 documentation files were deliberately left uncommitted** by both the audit session and this checkpoint session, per an explicit standing instruction not to commit/push/reset/deploy or otherwise change repository state without being directly told to in that session. This is not an oversight — do not "clean up" by committing them on your own initiative; ask the project owner first.

## Next three recommended actions

1. **Ask the project owner whether to commit the 17 documentation files.** This is a question the new session should ask, not decide unilaterally — see `HANDOFF.md`'s "anything the new account must ask" section. If told to proceed: `git add README.md CLAUDE.md PROJECT_STATE.md ARCHITECTURE.md FILE_MAP.md FEATURES.md TASKS.md ROADMAP.md DECISIONS.md DATABASE.md API_REFERENCE.md UI_SYSTEM.md SECURITY.md TESTING.md DEPLOYMENT.md CHANGELOG.md SESSION_LOG.md HANDOFF.md && git commit`, then re-run the verification block below before considering it done.
2. **Fix `SEC-001`**: `alter table subscription_entitlements enable row level security;` in a new migration (e.g. `0022_subscription_entitlements_rls.sql`), following the exact pattern of every prior "found a table with RLS disabled" fix in this project's history (`0006_phase4_rls.sql`, `0016_moderation_rls.sql`). Since nothing reads this table, a minimal "deny all client access, service-role only" policy set (or literally zero policies with RLS enabled) is sufficient and lowest-risk.
3. **Real two-person manual test**: two different humans, two different devices, one Yume room — camera, mic, screen share, YouTube, and Spotify all exercised together. This is the single highest-value remaining verification step and cannot be done via API calls. (Confirming the Spotify redirect URI — `TASKS.md` `CONFIRM-001` — is a prerequisite for the Spotify half of this test.)

## Verification required before continuing

Before starting new feature work, a new session should re-run (all fast, non-destructive):

```bash
cd apps/web && pnpm run typecheck && pnpm run lint && pnpm run build
cd apps/mobile && pnpm run typecheck
```

All four should pass cleanly (they did at audit time). If any fail, the repository has drifted from this document since the audit — treat this file as stale and investigate before trusting anything else in it.
