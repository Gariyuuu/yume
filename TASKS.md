# TASKS.md — Active Execution Queue

Update this file after every meaningful session. IDs are stable — don't renumber existing tasks, just change status.

---

## Current task

**DOCS-001 — Documentation/memory-system handoff audit (functionally complete, uncommitted)**

- **Status:** Functionally complete. Not committed. Awaiting an explicit go/no-go from the project owner on committing.
- **Exact objective:** Create a permanent, repository-based memory system (17 root-level markdown files) so that a brand-new Claude Code account — with zero access to this or any prior conversation — can resume development on Yume with minimal rediscovery, and perform a same-day "account-switch checkpoint" to re-verify and correct that system before the next handoff.
- **What has already been completed:**
  - All 17 files written: `CLAUDE.md`, `PROJECT_STATE.md`, `ARCHITECTURE.md`, `FILE_MAP.md`, `FEATURES.md`, `TASKS.md` (this file), `ROADMAP.md`, `DECISIONS.md`, `DATABASE.md`, `API_REFERENCE.md`, `UI_SYSTEM.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md`, `CHANGELOG.md`, `SESSION_LOG.md`, `HANDOFF.md`.
  - `README.md` rewritten (was stale — said "Phase 1: planning, no code written").
  - Verification re-run and passed: `apps/web` typecheck/lint/build, `apps/mobile` typecheck — all clean.
  - A cross-file accuracy/contradiction pass performed, which found and fixed a real self-inconsistency: the table count was documented as "29 tables" in `CLAUDE.md`, `ARCHITECTURE.md` (diagram label), and `SECURITY.md`, but cross-referencing every `create table` statement in `supabase/migrations/*.sql` shows **30** tables (`rate_limit_counters`, added in `0016_moderation_rls.sql`, was documented in `DATABASE.md`'s table reference but omitted from the summary count and ER-diagram note). All four now corrected to 30 total / 29 RLS-enabled / `subscription_entitlements` the one exception.
  - A secret-value scan across all 17 files plus `README.md` — no API keys, tokens, or passwords found (confirmed via `grep` for known patterns from real credentials the project owner shared earlier in chat, e.g. `sb_secret_...`, `AIzaSy...`, `sbp_...`).
  - No application code or database state was changed — this task is documentation-only.
- **What remains:** Nothing code-side. The single remaining step is a decision, not work: **whether to `git add`/`git commit` (and optionally push) the 17 new/updated files.** This has been deliberately left undone in both the audit session and this checkpoint session because of a standing instruction not to commit/push/reset/deploy without being explicitly told to in that session.
- **Relevant files:** all 17 files listed above, plus `README.md` (modified, unstaged).
- **Known errors:** none. All four verification commands (`typecheck`×2, `lint`, `build`) passed cleanly on the most recent run.
- **Blockers:** the commit decision above — this blocks nothing technical, but a new session should surface the question rather than assume either answer.
- **Acceptance criteria:** either (a) the project owner confirms the files should be committed, they get committed with `git status` showing a clean tree afterward on `main`, and `PROJECT_STATE.md`/this file are updated to reflect the new commit hash; or (b) the owner says to leave them uncommitted for now, in which case this task can be marked done as-is and the note about pending-commit state should stay in `PROJECT_STATE.md` until resolved.
- **Verification steps:** `git status` (confirm it matches the file list above, or reflects a clean tree if committed); `cd apps/web && pnpm run typecheck && pnpm run lint && pnpm run build`; `cd apps/mobile && pnpm run typecheck` — re-run once more after any commit, since a commit itself shouldn't change build output but is worth confirming.

Once DOCS-001 is resolved either way, pick the next task from "High priority" below — **`SEC-001` is the recommended default** (see its own entry for why).

## Next up

### SEC-001 — Enable RLS on `subscription_entitlements`
- **Status:** Open
- **Priority:** High (security)
- **Description:** `subscription_entitlements` has Row Level Security **disabled** on the live database (confirmed via direct query: `select relrowsecurity from pg_class where relname = 'subscription_entitlements'` → `false`). This means any authenticated (possibly anonymous) user can currently read/write arbitrary rows via PostgREST. Real-world severity is low right now because **no application code reads this table anywhere** (verified via full-repo grep) — so writing to it currently grants no actual privilege — but it's the same class of bug that has already caused three real incidents in this project (see `DECISIONS.md`), and it's a live, exploitable gap that should not be left open.
- **Relevant files:** new migration `supabase/migrations/0022_subscription_entitlements_rls.sql` (create it), `supabase/migrations/0001_init.sql` (table definition, lines ~323–333, do not edit), `SECURITY.md`.
- **Dependencies:** none.
- **Acceptance criteria:** `select relrowsecurity from pg_class where relname = 'subscription_entitlements'` returns `true` on the live project. Follow the exact pattern of `0006_phase4_rls.sql`/`0016_moderation_rls.sql` (enable RLS, add a minimal policy set — since nothing currently needs client access to this table, "service-role only, zero client policies" is the correct and lowest-risk choice, matching `game_round_secrets`' pattern).
- **Validation steps:** apply via `npx supabase db push`, then re-run the `pg_class` query above to confirm.
- **Blockers:** none.
- **Notes:** This is exactly the kind of one-migration, low-risk, high-value fix this project has done three times already this session — see `0018`, `0019`+`0020`, and the earlier `0006` for the pattern to copy.

---

## High priority

### BUG-002 — Owner-approval invite flow is a dead end
- **Status:** Open, known since Phase 2
- **Priority:** High (breaks a real, user-facing feature)
- **Description:** An invite created with `requires_owner_approval: true` sends a guest to `pending_approval` and then... nothing. There is no notification, no approval UI, no way for the room owner to ever let them in. This is explicitly documented in `supabase/functions/join-room/index.ts`'s own comments as a known gap.
- **Relevant files:** `supabase/functions/join-room/index.ts` (the `pending_approval` branch), `apps/web/src/app/invite/[token]/actions.ts` and `join-form.tsx` (client-side handling of the `pending` state), `notifications` table (exists, RLS-secured, completely unused — could be the mechanism for notifying the owner).
- **Dependencies:** would need a notification-delivery mechanism (the `notifications` table exists but has zero producers/consumers anywhere in the codebase) and an approval UI (e.g. a list of pending guests in `SafetyDialog` with approve/deny buttons, plus a new RPC or Server Action to flip the membership from pending to active).
- **Acceptance criteria:** a guest requesting to join a `requires_owner_approval` room can actually get approved and end up with a real `room_memberships` row.
- **Notes:** Either build this properly, or consider removing the `requires_owner_approval` checkbox from the invite-creation UI until it's built — currently it's possible for a real user to unknowingly create a broken invite.

### TEST-001 — Real two-person manual test
- **Status:** Open
- **Priority:** High
- **Description:** No real multi-browser/multi-device test has ever been performed. Camera, mic, screen share, spatial audio, and simultaneous YouTube+Spotify+call have all been verified only via code review or database-layer API testing, never with two actual humans.
- **Relevant files:** N/A — this is a manual QA task, not a code task. See `TESTING.md` for the smoke-test checklist to run.
- **Dependencies:** two people, two devices/browsers, a real room.
- **Acceptance criteria:** see `TESTING.md`'s manual smoke-test checklist, section "Multi-user live call."

### CONFIRM-001 — Confirm Spotify redirect URI is set
- **Status:** Open, flagged but never confirmed
- **Priority:** High (blocks Spotify entirely if not done)
- **Description:** `https://yume-gray.vercel.app/spotify/callback` needs to be added as a Redirect URI in the Spotify Developer Dashboard for this app's Client ID. This was identified as necessary and the user was asked to confirm it — no confirmation was ever recorded.
- **Relevant files:** N/A — external dashboard action, not code.
- **Acceptance criteria:** Spotify connect flow completes without a redirect-mismatch error.

---

## Medium priority

### DEBT-001 — Sync `packages/supabase-types/src/database.ts` with the real schema
- **Status:** Open
- **Priority:** Medium
- **Description:** The hand-maintained `Database` type is missing `subscription_entitlements` entirely (never added). There is no automated check that would catch this kind of drift, since there's no working `supabase gen types` path in this environment (needs a local Postgres instance via Docker, unavailable here).
- **Relevant files:** `packages/supabase-types/src/database.ts`.
- **Acceptance criteria:** every table in `supabase/migrations/*.sql` has a corresponding entry in `database.ts`. (Do this alongside `SEC-001` since you'll already be looking at the table.)

### DEBT-002 — Silent error-swallowing in several `use-<feature>-session.ts` hooks
- **Status:** Open
- **Priority:** Medium
- **Description:** `use-youtube-session.ts` and `use-spotify-session.ts` (and likely others following the same pattern) don't check the `error` field on Supabase responses — a failed insert/update just does nothing, with no toast, no console output, nothing. This exact class of silence made the YouTube autoplay bug harder to diagnose than it needed to be (though that particular bug turned out to be elsewhere).
- **Relevant files:** `apps/web/src/components/youtube/use-youtube-session.ts`, `apps/web/src/components/spotify/use-spotify-session.ts`.
- **Acceptance criteria:** failed mutations surface an error (toast or thrown) instead of failing silently.

### DEBT-003 — README.md is stale
- **Status:** Open (this audit may have already fixed it — check before redoing)
- **Priority:** Low-Medium
- **Description:** As of audit start, `README.md` said "Phase 1: planning. No production code has been written yet," which was untrue by 6 completed phases. This documentation audit should have corrected it — verify `README.md`'s current content matches reality before assuming this is still open.

### TEST-002 — Camera effects visual verification
- **Status:** Open
- **Priority:** Medium
- **Description:** Face-tracked accessory placement (`apps/web/src/lib/camera-effects/face-accessories.ts`) has never been checked against a live camera. It might be visually wrong (misaligned glasses/hat/mask).
- **Acceptance criteria:** turn on each accessory in a real browser with a real camera and confirm placement looks right; adjust the landmark-index math if not.

---

## Low priority

### FEAT-001 — Real Kenney decoration asset import
- **Status:** Deferred, documented in `ASSET_LICENSES.md`
- **Priority:** Low (cosmetic)
- **Description:** The 7 decoration assets are original hand-authored placeholder SVGs, not the real Kenney CC0 packs described in `docs/phase-1/08-licensing-review.md`. Needs downloading real asset packs, verifying licenses, uploading to the `room-assets` bucket.

### FEAT-002 — Extend data export coverage
- **Status:** Open, self-documented in code
- **Priority:** Low
- **Description:** `apps/web/src/app/settings/export/route.ts` covers `profile`/`room_memberships`/`owned_room_objects` only — its own comment flags it as needing extension to `room_messages`/`room_notes`/etc.

### FEAT-003 — Trivia and Draw & Guess on mobile
- **Status:** Deferred, deliberate
- **Priority:** Low
- **Description:** Would need the secret content (question bank, word bank) duplicated into a Deno-callable form (same pattern as Tic-Tac-Toe's `game-actions` Edge Function), and Draw & Guess additionally needs a canvas layer mobile doesn't have.

---

## Bugs

See `SEC-001`, `BUG-002` above (the only two currently-open bugs with real functional impact). All other bugs found during this project's live-testing pass were already fixed — see `DECISIONS.md` for the full account of each (profiles missing INSERT policy, rooms RETURNING/RLS interaction, join-room missing profile creation, YouTube autoplay policy).

## Technical debt

See `DEBT-001`, `DEBT-002`, `DEBT-003` above.

## Testing needed

See `TEST-001`, `TEST-002` above, plus: Trivia and Draw & Guess games have not been individually live-tested (only Tic-Tac-Toe was, as the representative case — the dispatch mechanism is shared). Study mode has not been individually live-tested. Data export and account deletion have not been live-tested.

## Documentation needed

None outstanding as of this audit — this pass created the full memory system. Future sessions: keep it updated per the rules in `CLAUDE.md`.

## Recently completed

*(most recent first — mirrors the git log)*

- Fixed: YouTube videos never actually playing (browser autoplay policy) — `638931a`
- Added: persistent nav bar + working sign-out + neon theme redesign + custom backgrounds + in-app changelog — `adb717f`
- Fixed: guests (and any brand-new user) could never actually join a room (missing profile-creation step in `join-room`) — `2ef8bff`
- Redesigned: full visual theme (was accidentally using zero custom branding this whole project due to undefined Tailwind theme tokens) — `245e8ba`
- Fixed: room creation completely broken (RLS RETURNING/SELECT-policy interaction) — `fe5cd2e`
- Fixed: first-ever login completely broken (`profiles` had no INSERT policy) — `5af5cf8`
- Fixed: duplicate RLS policy blocking migrations + Turbo cache secret declarations — `e909436`
- Fixed: `apps/web/.env.example` silently excluded from git since Phase 2 — `e41b196`
- Built: Phase 7 (safety system, room snapshot/share, App Store prep) — `b40db49`
- Built: Phase 6 (camera effects, game SDK, 3 games) — `85912a3`
- Built: Phase 5 (chat, YouTube, Spotify, timers, study mode) — `0aa2867`
- Built: Phase 4 (decoration toolset, drawing, notes, templates, autosave) — `fb567e4`
- Built: Phase 3 (LiveKit voice/video, camera bubbles, screen share, spatial audio) — `622f883`
- Built: Phase 2 (monorepo, auth, rooms, invites, guest join, basic canvas) — `7a989fe`
- Built: Phase 1 (product/architecture/data-model/security planning docs) — `01a8b69`
- Deployed to production: live Supabase project + LiveKit project + Vercel deployment, with GitHub auto-deploy connected.

## Deferred

- Website ad system (not started at all — see `FEATURES.md`).
- Premium tier activation (schema exists, deliberately inactive — see `FEATURES.md`).
- Android app (explicitly out of scope for v1 per the original product brief).
- Real Kenney asset import (`FEAT-001`).

## Rejected ideas

None recorded — no evidence in the repository of ideas explicitly considered and rejected. If this happens in the future, log it here with the reasoning.
