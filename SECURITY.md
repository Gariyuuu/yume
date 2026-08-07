# SECURITY.md — Defensive Security Review

This is a review performed by reading the code and querying the live database's actual configuration — not a penetration test, and not exhaustive. No destructive or unauthorized testing was performed.

---

## Findings

### SEC-001 — `subscription_entitlements` has Row Level Security disabled (OPEN)
- **Severity:** Low real-world impact, but a genuine live gap of a proven-dangerous class.
- **Evidence:** `select relrowsecurity from pg_class where relname = 'subscription_entitlements'` → `false`, confirmed against the live project at audit time.
- **Impact:** Any authenticated (and possibly anonymous — not separately re-verified) user can currently `SELECT`/`INSERT`/`UPDATE`/`DELETE` arbitrary rows in this table via PostgREST. **However**, a full-repository grep confirms **zero application code anywhere reads this table** — so writing `active: true, tier: 'premium'` to it right now grants no actual feature access, because nothing checks it. The danger is entirely latent: the moment someone *does* wire up a premium-gated feature that reads this table without separately re-enabling RLS first, it becomes a real privilege-escalation bug.
- **Recommended fix:** enable RLS via a new migration, following the exact precedent of `0006_phase4_rls.sql` and `0016_moderation_rls.sql` (both fixed the identical "table created with RLS disabled" mistake for other tables). Since nothing currently needs client access, a "RLS enabled, zero client policies" configuration (same as `game_round_secrets`, `rate_limit_counters`) is correct and lowest-risk.
- **Status:** documented, not fixed (see `TASKS.md` `SEC-001`).

### Historical findings (already fixed — included for pattern awareness)

These are not open issues, but they establish a clear, repeated pattern worth knowing about before writing new RLS or new `.insert().select()` calls:

- **Missing INSERT policy on `profiles`** — RLS enabled, SELECT + UPDATE policies present, INSERT policy simply never written. Blocked every first login. Fixed `0018_profiles_insert_policy.sql`. (`DECISIONS.md` ADR-005)
- **RETURNING-triggers-SELECT-policy interaction on `rooms`** — a correct INSERT policy, defeated by Postgres also enforcing the SELECT policy on the row an `INSERT...RETURNING` returns, combined with a same-transaction trigger side effect the SELECT policy depended on. Fixed `0020_rooms_owner_can_select.sql`. (`DECISIONS.md` ADR-006)
- **Missing profile-creation step in `join-room`** — a hard foreign-key requirement (`room_memberships.profile_id` → `profiles.id`) was never satisfied for brand-new guests, breaking the entire invite-join flow. Fixed by adding a lazy-upsert. (`DECISIONS.md` ADR-007)

**Pattern for future work:** any new table needs RLS enabled *and* a complete policy set (SELECT/INSERT/UPDATE/DELETE as applicable) verified against a live request, not just typechecked. `CREATE TABLE` in this project does not imply RLS is on by default — Supabase's default for a bare `CREATE TABLE` is RLS **disabled**, meaning fully open to the `anon`/`authenticated` roles' table-level grants.

---

## Authentication boundaries

- Supabase Auth (JWT-based), three methods: email/password, magic link, anonymous (guest). See `ARCHITECTURE.md` "Authentication flow."
- Session refresh: `apps/web/src/proxy.ts`, every non-static request.
- Route protection: **not** centralized — each protected Server Component page calls `requireUser()`/`requireProfile()` individually (`apps/web/src/lib/auth/session.ts`). A new protected page that forgets to call this would be unprotected; there is no fallback/catch-all enforcement layer. Worth double-checking whenever a new top-level route is added.

## Authorization boundaries

- RLS is the primary and near-universal authorization mechanism (see `ARCHITECTURE.md` ADR-001, and the three real bugs above). `room_role()` is the shared building block.
- Service-role usage (bypasses RLS entirely) is intentionally narrow and each usage is commented with why RLS wasn't sufficient: `apps/web/src/lib/supabase/service-role.ts`, all 5 Edge Functions, `game-dispatch.ts`.
- Moderation rank check (a moderator can't target the owner or another moderator) is enforced server-side in `moderate-participant`, not just hidden in the UI — verified live.

## Secret handling

- **Web env vars:** service-role key, Spotify client secret, YouTube API key are server-only (`SUPABASE_SERVICE_ROLE_KEY`, `SPOTIFY_CLIENT_SECRET`, `YOUTUBE_API_KEY` — no `NEXT_PUBLIC_` prefix, never bundled to the client). `SPOTIFY_CLIENT_ID` is also server-only despite not being inherently secret (used in `apps/web/src/app/spotify/connect/route.ts`, a Route Handler, not exposed to the browser directly).
- **Edge Function secrets:** `LIVEKIT_API_SECRET` never leaves `mint-livekit-token`/`moderate-participant`'s server-side code. Verified by reading every Edge Function — no secret is ever included in a JSON response body.
- **Game secret content:** trivia answers and Draw & Guess words live in `import "server-only"` files (`trivia-questions.ts`, `draw-and-guess-words.ts`) — Next.js's `server-only` package throws a build error if such a file is ever imported into client-bundled code, which is a real, enforced guarantee, not just a convention.
- **`.env.example` files:** placeholder-only, verified by reading both. **Real incident:** `apps/web/.env.example` was silently excluded from git for the entire project history due to an overly broad `.gitignore` pattern in `apps/web/.gitignore` (not the root one) — found and fixed. **Lesson: check both the root and any nested `.gitignore` before assuming a file is or isn't tracked.**
- **Invite passwords:** hashed with `scrypt` (Node's `crypto` module), random 16-byte salt per password, `timingSafeEqual` for comparison (`supabase/functions/join-room/invite-password.ts`, duplicated in `apps/web/src/lib/invite-password.ts` for the hashing side since Edge Functions and the Next.js app are different runtimes). This is real, sound cryptography, not a naive comparison.
- **LiveKit tokens:** signed server-side only, short-lived, scoped to one room. Verified live — the token structure was decoded and inspected.

## Client-exposed variables

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (web); `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_WEB_URL` (mobile). All are meant to be public — the anon/publishable key's security model is "safe to expose, RLS does the actual gating," which is correct for how Supabase is designed to be used.

## Input validation

Zod schemas (`packages/room-schema`) validate Server Action inputs where used. Not every Server Action re-validates with Zod before hitting the database (some rely on Postgres's own type/constraint enforcement, e.g. enum columns rejecting invalid values) — not individually audited per-action in this pass.

## SQL injection risk

Low — all database access goes through either the Supabase query builder (parameterized) or Postgres RPC functions with typed parameters (also parameterized). No raw string-concatenated SQL was found anywhere in application code (the Management-API raw-SQL calls used during this project's live debugging were run manually via `curl`, not from application code).

## Cross-site scripting (XSS) risk

- User-generated content (display names, chat messages, note text) is rendered via React's default JSX escaping — no `dangerouslySetInnerHTML` usage found anywhere in `apps/web/src` (verified via grep).
- **SVG uploads are deliberately excluded from the `uploads` bucket** (chat images) specifically because an SVG can carry an embedded `<script>` — a real, considered mitigation, documented in `0017_upload_restrictions.sql`'s comment. `room-assets` (which does allow SVG) is insert-restricted to service-role/seed only, not arbitrary user uploads, which is why that bucket's SVG allowance is safe.

## CSRF protections

Next.js Server Actions have built-in CSRF protection (same-origin checks on the POST request) — not a custom implementation, relying on the framework's default behavior.

## File upload risks

- Server-side `file_size_limit`/`allowed_mime_types` enforced by Supabase Storage itself on all 4 buckets (not just client-side validation) — see `DATABASE.md` "Storage buckets."
- **No malware/content scanning exists.** Documented as a deliberate, honest gap — no scanning API is configured or available in this environment. This is a real residual risk for any bucket accepting arbitrary user uploads (`uploads`, `avatars`, `user-backgrounds`).

## Webhook verification

**No webhooks exist in this project** (verified via grep — no Stripe, no payment provider, no third-party webhook receiver anywhere). Not applicable.

## Rate limiting

Implemented via a shared `check_rate_limit()` Postgres function (sliding-window counter, atomic via `INSERT...ON CONFLICT`), applied to: `join-room` attempts (direct call), guest chat messages, invite creation, and report submission (the latter three via `BEFORE INSERT` triggers, since those are direct client-to-Postgres writes with no Edge Function in the path to gate at). **Not load-tested** — limits (e.g. 20 messages/minute for guests) are reasonable-seeming defaults, not empirically tuned.

## Admin access

No global admin role exists. All elevated permission is per-room (`owner`/`moderator`). There is no "platform admin" concept anywhere in the schema or code.

## Database policies

See `DATABASE.md` for the full table-by-table RLS summary. 29 of 30 tables have RLS enabled with an appropriate policy set; `subscription_entitlements` is the one exception (`SEC-001`).

## Logging of sensitive data

No structured logging exists. Vercel/Supabase's own request logs may capture request bodies (not independently audited for whether they'd ever contain a password/token in plaintext — worth checking if this becomes a concern, since `join-room`'s POST body includes the invite password in plaintext over HTTPS, which is standard but means it could appear in access logs if any logging layer captures request bodies).

## Dependency concerns

Not independently audited (no `npm audit`/`pnpm audit` run during this pass — would be a reasonable addition to a future session's verification checklist). No dependency version pinning beyond what's in each `package.json` (mostly `^` ranges, meaning installs can drift on minor/patch versions between machines unless the lockfile is strictly honored).

## Production security gaps (summary)

1. `SEC-001` — `subscription_entitlements` RLS disabled. (Open)
2. No malware/content scanning on uploads. (Open, deliberate, documented)
3. No automated dependency vulnerability scanning. (Open, never set up)
4. No CI, so no automated gate catches a regression of any of the above before it reaches production (every deploy is one `git push` from live). (Open, structural)

## Recommended fixes, in priority order

1. Fix `SEC-001` (trivial, one migration).
2. Set up `pnpm audit`/`npm audit` (or GitHub Dependabot, once CI/GitHub Actions exists) as a periodic check.
3. Consider a lightweight CI workflow that runs `typecheck`/`lint`/`build` on every PR — this alone would not have caught any of the three RLS bugs found this session (they were runtime/data bugs, not type/lint errors), but it's a cheap first step and would catch regressions of a different class.
4. If uploads ever need to accept content from untrusted/adversarial users at scale (not just friends), revisit the "no scanning" gap.
