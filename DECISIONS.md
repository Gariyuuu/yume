# DECISIONS.md — Architectural Decision Log

Decisions here are either **Verified** (stated explicitly in a commit message or code comment — the original reasoning is preserved, not reconstructed) or **Inferred** (reconstructed from code structure/git history; the *what* is certain, the *why* is a reasonable reading, not a direct quote). No decision below fabricates reasoning that isn't traceable to the repository.

---

### ADR-001 — Direct RLS-scoped client access instead of a REST/GraphQL API layer
- **Status:** Accepted, foundational, unchanged since Phase 1
- **Context:** Needed a data-access pattern for two clients (web, mobile) sharing one backend.
- **Decision:** Most reads/writes go directly from client to Postgres via Supabase's PostgREST layer, authorized entirely by Row Level Security. No custom REST/GraphQL API server exists.
- **Reasoning:** Verified — `docs/phase-1/02-architecture.md` and `04-security-rls.md` establish this as the deliberate design, not an accident.
- **Alternatives considered:** Not documented in the repository.
- **Consequences:** Fast to build, but RLS becomes the *only* authorization boundary for most features — and this project has since had three real, exploitable bugs from RLS gaps (see ADR-005, ADR-006, ADR-007). A bug in a REST API layer would typically fail loudly (500 error); an RLS bug can fail *silently* in ways that look like "the feature just doesn't work," which is exactly what happened three times.
- **Affected files:** essentially the whole app; every `.from(table)` call in both clients.
- **Verified/Inferred:** Verified (explicit in planning docs).

### ADR-002 — Server Actions must have serializable arguments; split non-serializable logic into `server-only` helper files
- **Status:** Accepted, established mid-project
- **Context:** A game-move Server Action needed to accept a `GameEngine` object containing function properties (`createInitialState`, `applyMove`). Server Actions cannot cross the client/server boundary with function-valued arguments — Next.js requires plain serializable data.
- **Decision:** Split game logic into `game-dispatch.ts` (`import "server-only"`, **not** a Server Action, takes the engine as a parameter, called server-to-server) and per-game `actions.ts` files (`"use server"`, only serializable args like `sessionId`/`cellIndex`, each internally calling the matching `game-dispatch.ts` function with its own hardcoded engine).
- **Reasoning:** Verified — directly stated in `apps/web/src/app/room/[roomId]/games/game-dispatch.ts`'s header comment and in this project's own commit history.
- **Consequences:** This pattern should be reused for any future case where a Server Action needs to be parameterized by something non-serializable.
- **Affected files:** `apps/web/src/app/room/[roomId]/games/game-dispatch.ts`, `actions.ts`, `tic-tac-toe-actions.ts`, `trivia-actions.ts`, `draw-and-guess-actions.ts`.
- **Verified/Inferred:** Verified.

### ADR-003 — Three separate Supabase client constructors, never mixed
- **Status:** Accepted, foundational
- **Context:** Different execution contexts (browser, SSR, privileged server code) need different trust levels.
- **Decision:** `lib/supabase/client.ts` (browser, RLS-scoped), `server.ts` (SSR, RLS-scoped, cookie-based), `service-role.ts` (bypasses RLS, server-only, used only where RLS structurally can't express the needed rule).
- **Reasoning:** Inferred from consistent usage pattern across the codebase — every file that needs service-role access has an explicit comment justifying why RLS wasn't sufficient (e.g. `apps/web/src/lib/supabase/service-role.ts`'s own header, `game-dispatch.ts`'s "never trust client-claimed state" comment).
- **Consequences:** A service-role client leaking into a Client Component would be a critical security bug (exposes the service-role key to the browser). This has not happened, but there is no automated guard against it beyond code review discipline.
- **Verified/Inferred:** Inferred (the pattern is unmistakable; no single comment states the rule as a rule, but every usage follows it).

### ADR-004 — Two-tier real-time sync: Broadcast for ephemeral, Postgres Changes for persisted
- **Status:** Accepted, foundational
- **Context:** Some real-time state (live cursor position during a drag) doesn't need to survive a page refresh and would be wasteful to write to Postgres on every pixel of movement. Other state (a chat message) must persist.
- **Decision:** Tier 1 (Supabase Realtime Broadcast) for ephemeral high-frequency events; Tier 2 (Postgres Changes, triggered by an actual write) for everything that needs to persist.
- **Reasoning:** Verified — `docs/phase-1/05-sync-protocol.md`, still accurate to the implementation.
- **Affected files:** `apps/web/src/lib/live/use-live-broadcast.ts` (Tier 1), essentially every `use-<feature>.ts` hook's `postgres_changes` subscription (Tier 2).
- **Verified/Inferred:** Verified.

### ADR-005 — Fixed `profiles` table: added a missing INSERT policy
- **Date:** 2026-08-06 (this project's live-testing session)
- **Status:** Accepted, shipped (`5af5cf8`)
- **Context:** The very first login of any real user against the live database failed with "new row violates row-level security policy for table profiles." `profiles` had a SELECT policy and an UPDATE policy (`0002_rls.sql`) but **no INSERT policy at all** — RLS defaults to deny, so nothing could ever create the first profile row for a new user. This had existed since Phase 2 and was never caught because nothing had run against a live Supabase project until this session.
- **Decision:** New migration (`0018_profiles_insert_policy.sql`) adding `with check (id = auth.uid())` for INSERT, matching the existing UPDATE policy's self-row pattern.
- **Reasoning:** Verified — the migration's own comment explains the exact failure.
- **Alternatives considered:** None recorded — this is an unambiguous bug fix, not a design choice with tradeoffs.
- **Consequences:** Self-healing — any account that had already failed to get a profile row would succeed on its next page load, no manual data fix needed.
- **Affected files:** `supabase/migrations/0018_profiles_insert_policy.sql`.
- **Verified/Inferred:** Verified.

### ADR-006 — Fixed `rooms`: RETURNING triggers a SELECT-policy check, independent of the INSERT policy
- **Date:** 2026-08-06
- **Status:** Accepted, shipped (`fe5cd2e`, with a diagnostic-only intermediate commit)
- **Context:** Room creation failed with "new row violates row-level security policy for table rooms" even though the INSERT policy's `WITH CHECK (owner_id = auth.uid())` was directly, empirically proven to evaluate `true` (tested via a debug RPC and raw HTTP calls with a real session). Root cause, found by systematically ruling out every other layer: **Postgres additionally enforces the table's SELECT policy on any row an `INSERT ... RETURNING` tries to return** — and `supabase-js`'s `.insert(...).select().single()` triggers exactly this via PostgREST's `Prefer: return=representation` header. The `rooms` SELECT policy required a matching `room_memberships` row, which an `AFTER INSERT` trigger creates as a side effect of the same statement — but that trigger's effect wasn't visible to the RETURNING clause's own visibility check.
- **Decision:** Widen the `rooms` SELECT policy so the room's owner can always see their own room (`owner_id = auth.uid() OR <existing membership check>`), rather than removing the trigger or the `.select()` call.
- **Reasoning:** Verified — directly explained in the `0020_rooms_owner_can_select.sql` migration comment, and this is the single most instructive bug this project has hit (see `ARCHITECTURE.md` "Data flow" for the general-purpose lesson extracted from it).
- **Alternatives considered:** Making the trigger a `BEFORE` trigger instead — rejected, impossible, since `room_memberships.room_id` is a foreign key to `rooms.id`, which doesn't exist yet before the row is inserted (this exact chicken-and-egg problem is *why* the trigger is `AFTER` in the first place, per `0003_room_creation.sql`'s own comment).
- **Affected files:** `supabase/migrations/0019_rooms_insert_policy_recreate.sql` (an earlier, ultimately-unnecessary diagnostic step, kept since it was already applied to the live DB), `0020_rooms_owner_can_select.sql` (the real fix).
- **Verified/Inferred:** Verified.
- **General lesson (for future work):** any `.insert().select()` call against a table whose SELECT-policy visibility depends on a same-transaction trigger side effect on a *different* table is at risk of this exact failure mode. Check for it before assuming a new feature's "insert and read back" flow will work.

### ADR-007 — Fixed `join-room`: lazy profile creation was missing from the guest-join path
- **Date:** 2026-08-06
- **Status:** Accepted, shipped (`2ef8bff`)
- **Context:** After ADR-005 fixed direct-login profile creation, guest-join via invite link was still completely broken — a brand-new anonymous user (or any brand-new real user whose very first action was clicking an invite link) has no `profiles` row yet when `join-room` tries to insert their `room_memberships` row (which has a hard FK to `profiles(id)`). The failure was caught generically and reported back to the client as `reason: "invalid_token"` — indistinguishable from an actually-invalid invite link, so this bug was invisible from the outside; it just looked like every invite link was broken.
- **Decision:** `join-room` now upserts a `profiles` row (with `ignoreDuplicates: true`, so an existing profile's `display_name` is never overwritten) immediately after verifying the caller's identity, before anything that references `profile_id`.
- **Reasoning:** Verified — this exact chain of reasoning is in the Edge Function's own code comment.
- **Consequences:** Also fixed the misleading generic error reason (`"invalid_token"` was being reused for an unrelated membership-insert failure) — renamed to `"join_failed"`, a new value added to `packages/room-schema`'s `joinRoomResponseSchema` enum.
- **Affected files:** `supabase/functions/join-room/index.ts`, `packages/room-schema/src/invite.ts`, `apps/web/src/app/invite/[token]/actions.ts`.
- **Verified/Inferred:** Verified.

### ADR-008 — Fixed YouTube: player must start muted to satisfy browser autoplay policy
- **Date:** 2026-08-06
- **Status:** Accepted, shipped (`638931a`)
- **Context:** The database/sync layer for "watch together" was solid (verified independently), but the actual video never played for anyone who didn't personally just click something. Root cause: the player calls `playVideo()` in response to a Postgres Realtime event (someone else's action) — not a direct click — and Chrome/Safari silently block programmatic video playback unless it's either muted or a direct result of a user gesture. "Muted autoplay is always allowed" is a standard, documented browser exemption.
- **Decision:** The YouTube IFrame player now starts with `playerVars: { mute: 1 }`, with a visible mute/unmute toggle button.
- **Reasoning:** Verified — explained in the fix commit and in `apps/web/src/components/youtube/youtube-player.tsx`'s own comments.
- **Consequences:** This is a general class of bug for *any* "watch/listen together" feature synced via realtime events rather than direct user action — worth checking for in Spotify's Web Playback SDK usage too if Spotify playback issues are ever reported (not yet verified either way — see `FEATURES.md`).
- **Affected files:** `apps/web/src/components/youtube/youtube-player.tsx`, `apps/web/src/lib/youtube.ts`.
- **Verified/Inferred:** Verified.

### ADR-009 — Neon visual theme, applied globally via CSS custom properties
- **Date:** 2026-08-06
- **Status:** Accepted, shipped (`245e8ba`, `adb717f`)
- **Context:** User feedback described the app's look as "lackluster" and "just white." Investigation found the actual root cause: `globals.css` **never defined** the `brand-*` color scale, `room-bg`, `rounded-card`, or `rounded-bubble` Tailwind tokens that components throughout the app had been referencing since Phase 2 — they were silently no-op classes the entire project history, which is why the whole app rendered as generic default shadcn black-and-white instead of the intended purple branding (which mobile *did* have, via hardcoded hex values in its `StyleSheet` objects, since mobile doesn't use Tailwind).
- **Decision:** Defined the missing tokens, replaced the default grayscale palette with a near-black "neon night" theme (magenta/cyan glow accents via box-shadow, applied selectively to cards/dialogs/primary-buttons rather than every border), added a hand-authored SVG background image (`public/nebula-bg.svg` — no image-generation tool was available in the build environment, so this is the closest real asset to a requested raster image).
- **Reasoning:** Verified — explained in the fix commit.
- **Alternatives considered:** A light/dark toggle via `next-themes` (already an installed dependency) was **not** implemented — there is no `<ThemeProvider>` mounted anywhere; `next-themes` is currently dead weight in the dependency tree except for `sonner`'s theme-aware toast styling. If a toggle is ever wanted, this is the gap to fill.
- **Affected files:** `apps/web/src/app/globals.css`, `apps/web/src/components/starfield.tsx`, `apps/web/public/nebula-bg.svg`.
- **Verified/Inferred:** Verified.

### ADR-010 — Custom per-user background images stored in a dedicated public bucket
- **Date:** 2026-08-06
- **Status:** Accepted, shipped (`adb717f`)
- **Context:** Users wanted to personalize their background beyond the default nebula.
- **Decision:** New `profiles.background_url` column + a new public, own-folder-RLS-scoped `user-backgrounds` Storage bucket (mirrors the existing `avatars` bucket's exact pattern), applied client-side by `starfield.tsx` fetching the signed-in user's `background_url` and layering it (with a readability overlay) behind the same animated stars.
- **Reasoning:** Inferred from the migration comment and component structure — reusing the `avatars` bucket's proven pattern rather than inventing a new one.
- **Affected files:** `supabase/migrations/0021_custom_backgrounds.sql`, `apps/web/src/app/settings/background-upload.tsx`, `apps/web/src/components/starfield.tsx`.
- **Verified/Inferred:** Verified (migration comment) + Inferred (bucket-pattern reuse reasoning).

### ADR-011 — `subscription_entitlements` RLS gap found, deliberately left unfixed during this documentation audit
- **Date:** 2026-08-06 (documentation audit)
- **Status:** Documented, not yet fixed — see `TASKS.md` `SEC-001`
- **Context:** While auditing the repository for this documentation handoff, cross-referencing `supabase/migrations/0001_init.sql`'s table list against `packages/supabase-types/src/database.ts` revealed `subscription_entitlements` was never added to the TypeScript types. Following up, a live query against the production database confirmed `relrowsecurity = false` for that table — an open, unfixed instance of the *exact same bug class* as ADR-005/006/007, just never triggered because no application code touches this table at all.
- **Decision:** Document it prominently (this file, `SECURITY.md`, `TASKS.md`, `CLAUDE.md`) rather than fix it in the same pass, per the explicit instruction that this documentation audit should not implement product/behavior changes.
- **Reasoning:** Verified — this is the audit's own reasoning, stated directly.
- **Consequences:** This is now the single highest-priority next task for a future session (`TASKS.md` `SEC-001`) — a one-migration fix following an already-proven pattern.
- **Affected files:** none yet (fix not applied) — future fix goes in a new `supabase/migrations/0022_*.sql`.
- **Verified/Inferred:** Verified.
