# HANDOFF.md — Start Here

If you are a new Claude Code session with no memory of this project, read this file first, then follow its instructions.

## What is this project?

**Yume** — a persistent virtual-room app for small friend groups (2–12 people): voice/video with draggable camera bubbles, room decoration, drawing, synced YouTube/Spotify, study mode, and three multiplayer games. Web (Next.js) + iOS (Expo/React Native), shared Supabase backend. All 7 originally-planned phases are built and **the app is live in production** at https://yume-gray.vercel.app. Not a clone of Here.fm — original code/art/branding.

## What should I read first?

In this order:
1. `CLAUDE.md` — the full operating manual (stack, commands, conventions, critical rules, known issues).
2. `PROJECT_STATE.md` — exact state at last handoff (git state, what works, what's unverified, next actions).
3. `TASKS.md` — the active task queue, with the highest-priority item (`SEC-001`) fully specified.
4. Whichever of `ARCHITECTURE.md`/`FEATURES.md`/`DATABASE.md`/`API_REFERENCE.md`/`SECURITY.md`/`UI_SYSTEM.md` is relevant to what you're about to do.

## What is the current task?

None in progress — the repository was clean and fully committed when this handoff was prepared. The highest-priority next task is `TASKS.md`'s `SEC-001` (see below).

## What was the previous agent doing?

The immediately prior work was a live-testing hardening pass that found and fixed 4 real bugs (all documented in detail in `DECISIONS.md` ADR-005 through ADR-008), followed by this documentation audit itself — creating the memory system you're reading now. No code changes were made during the documentation audit beyond (a) confirming `README.md` was stale and rewriting it, and (b) a read-only live database query that discovered the `SEC-001` gap.

## What works right now?

Verified live (not just code-reviewed): sign-up/profile creation, room creation, guest join via invite, room canvas CRUD, chat, notes/timer creation, the full Tic-Tac-Toe flow (including server-side turn enforcement), the drawing layer, moderation (mute/kick/ban with a confirmed rejoin-block), LiveKit token minting, and YouTube (after fixing an autoplay-policy bug). Full list with evidence in `PROJECT_STATE.md`.

## What is broken?

- `TASKS.md` `BUG-002` — the owner-approval invite flow is a genuine dead end (a guest gets stuck forever, no approval UI exists).
- Everything else currently known is **unverified**, not confirmed broken — see the next section.

## What is unverified (might be fine, might not — nobody has checked)?

Screen sharing (code looks right, no real WebRTC test), Spotify (OAuth/SDK never exercised with a real account, and the production redirect URI was never confirmed set in the Spotify dashboard), camera effects' face-accessory visual accuracy, anything on a real mobile device (no native build has ever run), Trivia/Draw & Guess individually, study mode, account deletion, data export, and — the single biggest gap — real multi-person concurrent usage (2+ humans, camera+screenshare+YouTube+Spotify at once).

## What should I do next?

**Recommended: `TASKS.md`'s `SEC-001`.** It's a one-migration fix (`alter table subscription_entitlements enable row level security;` plus whatever minimal policy set matches the "service-role only" pattern already used by `game_round_secrets`/`rate_limit_counters`), following an exact, proven precedent in this codebase (`0006_phase4_rls.sql`, `0016_moderation_rls.sql`). Full acceptance criteria in `TASKS.md`.

If you'd rather do something with more product value: `TASKS.md`'s `TEST-001` (a real two-person manual test) costs no code changes and is the single highest-value verification step remaining — it would either confirm the app genuinely works end to end, or surface the next real bug the way the last three were found (live testing, not code review).

## Which files are most important?

`apps/web/src/app/room/[roomId]/page.tsx` (the central hub almost every feature wires into), `apps/web/src/lib/auth/session.ts` + the three Supabase client files in `apps/web/src/lib/supabase/`, every file in `supabase/migrations/` and `supabase/functions/`, `packages/supabase-types/src/database.ts`. Full map in `FILE_MAP.md`.

## Which areas are dangerous to modify?

Anything in `CLAUDE.md`'s "DO NOT CHANGE WITHOUT REVIEW" section — in short: already-applied migrations (add a new one instead of editing), RLS policies (this project has a proven, repeated history of RLS bugs — test live, not just typecheck), the service-role client and anything importing it, `packages/supabase-types/src/database.ts` (keep in sync by hand), `turbo.json`'s secret-env-var list, both `.gitignore` files (there's a real incident on record of a nested one silently excluding a file from the entire repo), the hand-tuned Vercel Root-Directory/Build-Command settings (see `DEPLOYMENT.md`), and the LiveKit token-minting code (never let the API secret reach a client).

## Which commands should I run first?

```bash
cd apps/web && pnpm run typecheck && pnpm run lint && pnpm run build
cd apps/mobile && pnpm run typecheck
```
All four should pass cleanly (they did at handoff time). If any fail, this documentation may be stale relative to the current code — investigate before trusting anything else here.

## How do I verify the app still works?

There's no automated test suite (`TESTING.md` explains why and what exists instead). The real verification method proven in this project: direct `curl` calls against the live Supabase project using a disposable anonymous test account, cleaned up afterward. `TESTING.md` has the exact methodology and a manual smoke-test checklist. For anything touching auth/rooms/RLS specifically, prefer this over trusting that `typecheck`/`lint`/`build` passing means it works — it has not, three times, in this project's actual history.

---

## Prompt for the next Claude Code account

Copy-paste this to start the next session:

```
Read CLAUDE.md, PROJECT_STATE.md, TASKS.md, and HANDOFF.md in full before doing
anything else. Then:

1. Run `git status` and `git log --oneline -10` and confirm the repository
   matches what PROJECT_STATE.md describes. If it doesn't, treat the memory
   files as stale and tell me what's actually different before proceeding.
2. Run `cd apps/web && pnpm run typecheck && pnpm run lint && pnpm run build`
   and `cd apps/mobile && pnpm run typecheck` to confirm the documented
   "all four pass cleanly" baseline still holds.
3. Give me a short summary (a few sentences) of your understanding of the
   project and its current state, in your own words, before touching any
   code — I want to catch it early if you've misunderstood something.
4. Point out anything in the documentation that contradicts what you find in
   the actual code, or that looks stale/wrong.
5. Then continue work on TASKS.md's current/next-up items — do not redo
   completed work, and do not re-architect existing patterns (the Server
   Action serialization split, the three-Supabase-client convention, the
   RLS-first authorization model, etc.) without a strong, stated reason.
6. When you're done with meaningful work, update PROJECT_STATE.md, TASKS.md,
   append to SESSION_LOG.md, and update whichever other memory file your
   change affects — per the "Permanent rules for future development" section
   at the bottom of CLAUDE.md. This repository is the only persistent memory
   this project has between sessions; treat the memory files as seriously as
   the code itself.
```
