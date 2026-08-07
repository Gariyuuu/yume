# CLAUDE.md — Primary Operating Manual

**Read this file first, every session.** Then read `PROJECT_STATE.md` and `TASKS.md` before touching any code. This file is the permanent memory system for Yume — it exists because prior work happened in chat sessions with no persistent memory, and this repository is now the single source of truth going forward.

Audit basis: this file was generated 2026-08-06 by direct repository inspection (file reads, `git log`, live Supabase queries against the actual deployed project) — not from chat history. Where something could not be verified, it says so.

---

## Project identity

- **Name:** Yume (working codename — **not final branding**, see `docs/phase-1/01-prd.md` §8 open questions)
- **One-sentence description:** A persistent virtual "room" web + iOS app for small friend groups — voice/video, movable camera bubbles, room decoration, drawing, synced YouTube/Spotify, study mode, and three small multiplayer games.
- **Product summary:** Each room is a private, invite-only persistent space (like a Discord voice channel crossed with a decorable virtual apartment). Members drag their camera bubble around a canvas, decorate the room with furniture/rugs/posters, draw together, watch YouTube or listen to Spotify in sync, run Pomodoro study sessions together, and play Tic-Tac-Toe/Trivia/Draw & Guess. Explicitly **not** a clone of Here.fm — original branding, code, and art (see `docs/phase-1/01-prd.md` for the full brief this was built against).
- **Target audience:** Small groups of friends (2–12 people) who want a persistent hangout space, not a public social network. No public room discovery by design.
- **Current development stage:** All 7 originally-planned phases are built and the app is **live in production** with a real Supabase backend, real LiveKit project, and real Spotify/YouTube API keys. It has been through one round of live-bug-hunting (see `PROJECT_STATE.md` and `DECISIONS.md` for what was found and fixed). It has **zero automated tests** and has never been reviewed by a second engineer or a lawyer — treat it as a working beta, not a hardened production system.
- **Production status:** Deployed and reachable at **https://yume-gray.vercel.app** (Vercel project `yume`, org `garywangsmes-8349s-projects`). One real user account exists in the live database. iOS app has never been built via EAS/TestFlight — mobile only exists as source code run through Expo dev tooling.
- **Repository type:** Monorepo (pnpm workspaces + Turborepo). Two apps (`apps/web` Next.js, `apps/mobile` Expo/React Native), three shared packages, one Supabase backend (migrations + Edge Functions) shared by both apps.

---

## Current status

*(This section is a summary. `PROJECT_STATE.md` is the authoritative, more detailed version — if they ever disagree, trust `PROJECT_STATE.md` and fix this section.)*

- **Latest completed milestone:** A full live-testing pass across every core feature (auth, rooms, chat, canvas, drawing, notes, timers, games, YouTube, moderation) using direct API calls against the live Supabase project. Multiple real bugs were found and fixed this way — see `DECISIONS.md` and the git log (commits from `5af5cf8` through `638931a`).
- **Current active task:** None in progress — the repository was in a clean, deployed, working state when this documentation audit was performed. See "Recommended next action" in `HANDOFF.md`.
- **Known blockers:** None blocking basic web usage. iOS build/App Store submission is blocked on an Apple Developer Program enrollment (not started, $99/yr — see `docs/app-store-review-notes.md`). Legal pages (`/privacy`, `/terms`) are accurate but not lawyer-reviewed.
- **Highest-priority next task:** Fix `subscription_entitlements` — it has **Row Level Security disabled on the live database** (verified via direct query, 2026-08-06), meaning any authenticated user can currently read/write arbitrary rows in that table via PostgREST. Low real-world severity right now (nothing in the app reads this table, so it grants no actual privilege), but it is a live, exploitable gap of the exact same class as three other bugs already found and fixed this session. See `SECURITY.md` and `TASKS.md` task `SEC-001`.

---

## Technology stack

Versions below are read directly from `package.json` files — do not upgrade anything without checking `packages/*/package.json` and both apps' manifests for the real current pin.

| Layer | Technology | Version (as pinned) | Where |
|---|---|---|---|
| Language | TypeScript | `^5.6.3` (root), `^5`/`~6.0.3` per-package | everywhere |
| Package manager | pnpm | `9.12.0` (pinned via `packageManager` field) | root `package.json` |
| Monorepo tool | Turborepo | `^2.1.3` | root `package.json`, `turbo.json` |
| Web framework | Next.js | `16.3.0` (App Router, Turbopack) | `apps/web/package.json` |
| Web UI runtime | React | `19.2.8` | `apps/web/package.json` |
| Web styling | Tailwind CSS | `^4` (CSS-based `@theme`, no `tailwind.config.js`) | `apps/web/src/app/globals.css` |
| Web component kit | shadcn/ui on Base UI (`@base-ui/react`) | `^1.6.0` | `apps/web/src/components/ui/` |
| Web canvas | Konva + react-konva | `^9.3.16` / `^19.0.10` | room decoration canvas, drawing layer |
| Mobile framework | Expo | `~57.0.9` (React Native `0.86.2`, React `19.2.3`) | `apps/mobile/package.json` |
| Mobile canvas | `@shopify/react-native-skia` | `^2.10.1` | mobile room canvas |
| Real-time voice/video | LiveKit (`livekit-client`, `@livekit/components-react`, `@livekit/react-native`) | `^2.21.0` / `^2.9.23` / `^2.12.0` | both apps |
| Backend | Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) | live project `jnercugeinepkgmbxdvn` | `supabase/` |
| Validation | Zod | `^3.23.8`/`^3.25.76` | `packages/room-schema`, `packages/game-sdk` |
| On-device camera ML | `@mediapipe/tasks-vision` | `^1.0.1` | `apps/web/src/lib/camera-effects/` (web only) |
| Hosting | Vercel | project `yume` | web app only |
| Music integration | Spotify Web API + Web Playback SDK (official) | — | `apps/web/src/lib/spotify/` |
| Video integration | YouTube IFrame API (official) | — | `apps/web/src/lib/youtube.ts` |
| Toasts | `sonner` | `^2.0.7` | web |
| Icons | `lucide-react` | `^1.28.0` | web |
| Lint | ESLint | `^9` (`eslint-config-next` for web, custom preset for packages) | `apps/web/eslint.config.mjs`, `packages/config/eslint-preset.js` |
| Formatting | **None detected.** No Prettier config anywhere in the repo. | — | — |
| Testing | **None.** No test framework, no test files, no CI. | — | — |
| CI/CD | **None.** No `.github/workflows`. Deployment is via `vercel deploy` (CLI) with GitHub auto-deploy connected for pushes to `main`. | — | — |

---

## Essential commands

All commands assume you're at the **repo root** unless noted. This is a pnpm workspace — `pnpm --filter <name>` or `cd` into the package both work; examples below show the `cd` form since that's what's been used in practice.

```bash
# Install (repo root, always)
pnpm install

# Dev servers
cd apps/web && pnpm dev        # Next.js dev server, Turbopack
cd apps/mobile && pnpm start   # Expo dev server (scan QR / press i for iOS sim)

# Type checking (per-package; also runnable at root via turbo)
pnpm exec turbo run typecheck        # all packages
cd apps/web && pnpm run typecheck    # runs `next typegen && tsc --noEmit`
cd apps/mobile && pnpm run typecheck # `tsc --noEmit`

# Lint (web only — mobile has no lint script)
cd apps/web && pnpm run lint

# Build
cd apps/web && pnpm run build   # `next build`
pnpm exec turbo run build       # all buildable packages

# Tests
# NONE EXIST. `pnpm test`/`turbo run test` will run in packages that
# happen to declare a "test" script — currently none do. Do not claim
# "tests pass" for this repo; there is nothing to run.

# Supabase (requires `npx supabase login --token <token>` first — a
# Supabase *personal access token* from supabase.com/dashboard/account/tokens,
# distinct from the project's anon/service-role keys)
npx supabase link --project-ref jnercugeinepkgmbxdvn
npx supabase db push                      # apply pending migrations to the LIVE project — there is no local Postgres in this environment
npx supabase functions deploy             # deploy all 5 Edge Functions
npx supabase functions deploy <name>      # deploy one
npx supabase secrets list                 # list (not view) Edge Function secrets

# There is no local Supabase instance in this environment (Docker is not
# available — every `supabase functions deploy` run has printed
# "WARNING: Docker is not running"). `supabase db seed` / `supabase start`
# are NOT usable here. `supabase/seed.sql` was applied by hand via the
# Management API's raw SQL query endpoint instead — see DEPLOYMENT.md.

# Deployment (web)
vercel deploy --prod --yes       # from repo root — project Root Directory is set to apps/web (see DEPLOYMENT.md for why this matters in this monorepo)
vercel ls yume                   # check deployment status
git push origin main             # ALSO deploys — GitHub auto-deploy is connected, every push to main triggers a production deploy automatically

# Deployment (mobile)
# NEVER DONE. No EAS build has ever been run. `eas.json` has build
# profiles configured but no `submit` block (needs a real Apple
# Developer account — see docs/app-store-review-notes.md).
```

No project-specific scripts exist beyond what's in each `package.json`. There is no `db:migrate`/`db:seed`/`generate-types` npm script — the equivalent operations are done via the raw `supabase` CLI commands above.

---

## Repository structure

```
yume/
├── apps/
│   ├── web/          Next.js 16 App Router web app — THE primary, most complete client
│   └── mobile/        Expo/React Native iOS app — deliberately thinner, see FEATURES.md
├── packages/
│   ├── room-schema/    Zod schemas + inferred types shared by both apps (profiles, rooms, messages, etc.)
│   ├── supabase-types/ Hand-maintained TypeScript types mirroring the Postgres schema (Database type)
│   ├── game-sdk/       Pure game-logic engines (Tic-Tac-Toe/Trivia/Draw&Guess) — no I/O, shared by web + the mobile game-actions Edge Function's *logic* (Deno can't import this package directly, see FILE_MAP.md)
│   └── config/         Shared eslint preset + (declared but unused) tailwind preset / tsconfig base
├── supabase/
│   ├── migrations/      21 sequential SQL migrations — the real source of truth for the DB schema
│   ├── functions/        5 Deno Edge Functions (service-role-privileged server code)
│   └── seed.sql          Decoration assets + room templates — NOT auto-applied, must be run by hand
├── docs/
│   ├── phase-1/           Original Phase 1 planning docs (PRD, architecture, data model, security, etc.) — historical intent, may have drifted from actual implementation; treat code as source of truth where they disagree
│   └── app-store-review-notes.md   App Store submission prep notes
├── ASSET_LICENSES.md   Tracks the (currently placeholder, not-Kenney) decoration art licensing
├── README.md            STALE — still says "Phase 1: planning, no code written." Needs a rewrite; low priority, doesn't block anything
└── (this file, PROJECT_STATE.md, ARCHITECTURE.md, etc.)  The memory system this audit created
```

**apps/web** — what belongs there: all Next.js routes/pages, Server Actions, Route Handlers, React components, and web-only libs. Entry points: `src/app/layout.tsx` (root layout, mounts the `Starfield` background), `src/proxy.ts` (Next 16's renamed `middleware.ts` — refreshes the Supabase session cookie on every request), `src/app/page.tsx` (redirects to `/rooms` or `/sign-in`).

**apps/mobile** — what belongs there: Expo screens/components. No file-based routing — navigation is hand-rolled `useState` screen-switching in `App.tsx` (see `ARCHITECTURE.md`). Deliberately behind web in scope (no drawing layer, no multi-select, only 1 of 3 games, no camera effects) — every gap is intentionally documented in-code, not silently missing.

**packages/room-schema, packages/supabase-types, packages/game-sdk** — shared logic. Edit these when changing a shape that both apps consume. **`packages/supabase-types/src/database.ts` must be kept in sync with `supabase/migrations/*.sql` by hand** — there is no working type generator in this environment (see "Database summary" below and `DATABASE.md`).

**supabase/** — the entire backend. Migrations are additive and sequential; never edit an already-applied migration (see "Critical rules"). Edge Functions are self-contained Deno files using `npm:` specifiers — they cannot `import` from `packages/*` (different runtime), so shared logic that both a package and an Edge Function need (e.g. the Tic-Tac-Toe engine) is deliberately duplicated with a comment explaining why (see `supabase/functions/game-actions/index.ts`).

---

## Architecture summary

See `ARCHITECTURE.md` for the full write-up with diagrams. Summary:

- **Frontend (web):** Next.js App Router, mostly Server Components for data-loading pages, Client Components for anything interactive (canvas, chat, dialogs). Auth/session checks happen per-page via `requireUser()`/`requireProfile()` (`apps/web/src/lib/auth/session.ts`), not centrally in middleware — `proxy.ts` only refreshes cookies.
- **Frontend (mobile):** Plain React Native, no navigation library (hand-rolled screen switching in `App.tsx`), direct Supabase client calls from components (no server layer at all on mobile — everything either talks to Supabase directly under RLS, or to the same Edge Functions the web app uses).
- **Backend:** Supabase Postgres is the source of truth. Most reads/writes go **directly from the client to Postgres via RLS-scoped PostgREST calls** (via `@supabase/supabase-js`) — there is no traditional REST API layer for most features. A small number of operations that need service-role privileges (bypass RLS) or cross-system side effects (LiveKit) go through either Next.js Server Actions calling a service-role Supabase client (web-only), or Supabase Edge Functions (callable from both web and mobile).
- **Real-time:** Supabase Realtime — Postgres Changes subscriptions for most synced state (chat, notes, timers, game state, YouTube/Spotify session state), Realtime Broadcast for ephemeral high-frequency events (live cursor/drag position, draw strokes) that never need to hit Postgres, Realtime Presence for who's-online.
- **Voice/video:** LiveKit Cloud, one room per Yume room. Tokens are minted server-side only (`mint-livekit-token` Edge Function) — the LiveKit API secret never reaches a client.
- **Auth:** Supabase Auth. Email/password, magic link, and Anonymous Auth (for guests joining via invite link with just a display name — no account).
- **Data access pattern:** Row Level Security is the *only* authorization boundary for most tables. There is no separate application-level permission-checking layer for direct-RLS-insert flows — if RLS is wrong, the bug is exploitable. This has bitten this project multiple times already (see `DECISIONS.md`).

---

## Coding conventions

**Verified from the repository** (i.e., this is what the code actually does, not aspirational):

- **Files/components:** kebab-case filenames (`participant-bubble.tsx`), PascalCase component names, one component per file for anything non-trivial.
- **Hooks:** `use-` prefixed files (`use-room-chat.ts`), colocated with the feature that uses them (`components/chat/use-room-chat.ts`, not a global `hooks/` folder).
- **Server Actions:** `"use server"` files named `actions.ts` (or `<feature>-actions.ts`) colocated in the route folder (e.g. `apps/web/src/app/rooms/actions.ts`). Server Action arguments/return values must be plain serializable data — this project hit that limit once (see `DECISIONS.md` ADR on the game-dispatch split) and the fix pattern is: split cross-cutting logic needing non-serializable params (like a `GameEngine` object with function properties) into a separate `import "server-only"` file that is *not* itself a Server Action, called server-to-server by thin serializable-args wrapper Server Actions.
- **Supabase client construction:** three flavors, never mixed —
  - `apps/web/src/lib/supabase/client.ts` — browser client, RLS-scoped as the signed-in user, for Client Components.
  - `apps/web/src/lib/supabase/server.ts` — SSR client reading cookies, RLS-scoped as the signed-in user, for Server Components/Actions/Route Handlers.
  - `apps/web/src/lib/supabase/service-role.ts` — bypasses RLS entirely. Used **only** where RLS structurally cannot express the rule needed (documented per call site, e.g. game move validation, moderation actions).
- **Validation:** Zod schemas in `packages/room-schema`, one file per domain concept (`profile.ts`, `room.ts`, `message.ts`, etc.), re-exported from `index.ts`.
- **Error handling:** Server Actions return `{ error?: string }`-shaped state objects (used with `useActionState`/`useTransition`), not thrown exceptions, for anything a form/button needs to display. Toasts (`sonner`) surface action errors client-side.
- **Comments:** Sparse, and used specifically to explain *why*, not *what* — a very consistent pattern of "this looks like it should work a different way; here's the non-obvious reason it doesn't" comments throughout the codebase (see any file with a comment starting with "NOTE:" or a multi-line block comment above a function). Preserve this style; don't add narrative comments describing obvious code.
- **Real-time subscriptions:** every hook that opens a Supabase Realtime channel unsubscribes in a `useEffect` cleanup (`supabase.removeChannel(channel)`) — check for this when adding new subscriptions, it's easy to leak.
- **"Real vs. thinner, never faked" pattern:** repeated explicitly throughout commit messages and code comments — when a feature is scoped down for mobile or deferred, it's documented as a real, working, intentionally-smaller version, never a stub/mock pretending to be complete. Preserve this discipline; don't introduce fake/mocked functionality without a loud comment saying so.

**No test conventions exist** (there are no tests). **No Prettier config exists** — formatting is whatever each file happened to be written with; ESLint does not enforce formatting rules beyond its default rule set.

---

## UI and design system

See `UI_SYSTEM.md` for full detail. Quick reference:

- **Theme:** single fixed "neon night" theme — near-black background, magenta/cyan glow accents, no light-mode/dark-mode toggle (despite `next-themes` being installed, no `<ThemeProvider>` is ever mounted — it's currently unused dead weight in the dependency tree, kept alive only by `sonner`'s theme-aware toast styling).
- **Theme tokens:** `apps/web/src/app/globals.css` — CSS custom properties under `:root`/`.dark` (both currently hold identical values), plus a Tailwind v4 `@theme inline` block defining the `brand-*` color scale, `room-bg`, and `radius-card`/`radius-bubble` custom tokens.
- **Background:** `apps/web/public/nebula-bg.svg` (hand-authored, not a generated/stock image) referenced as the `<body>` background-image, overridable per-user via an uploaded custom image (`profiles.background_url`, applied by `apps/web/src/components/starfield.tsx`).
- **Component library:** shadcn/ui components in `apps/web/src/components/ui/` (Button, Dialog, Card, Input, Badge, Separator, Tabs, Sonner-toast wrapper) — built on Base UI (`@base-ui/react`), not Radix.
- **Icons:** `lucide-react` throughout.
- **Custom radius names:** `rounded-card` (used on room/template cards, dialogs), `rounded-bubble` (fully round, participant camera bubbles).
- **Accessibility:** icon-only buttons across both apps have `aria-label`/`title` (added in a dedicated pass — see `DECISIONS.md`); this was a spot-check, not an automated audit (no axe/Lighthouse run in this environment).
- **Mobile styling:** plain React Native `StyleSheet.create` objects with hardcoded hex colors (`#9f22cd`, `#bb3af0`, `#6b1988` — the same purple family the web `brand-*` scale is anchored on), no shared design-token system between web and mobile.

---

## Environment setup

**Web (`apps/web/.env.local`, copy from `apps/web/.env.example`):**

| Variable | Required | Client/Server | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client + Server | Supabase publishable/anon key (new-style `sb_publishable_...` format on this project) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Client + Server | Own deployed origin — used for auth email redirects and invite link generation. Must be updated if the deploy URL/domain ever changes. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only | Bypasses RLS — used by game move dispatch and moderation-adjacent server code. **Sensitive.** |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Optional (Spotify sync degrades without it) | Server only | Spotify OAuth. **Secret is sensitive.** |
| `YOUTUBE_API_KEY` | Optional (only gates the in-app *search* box; pasting a URL works without it) | Server only | YouTube Data API v3. |

**Mobile (`apps/mobile/.env.local`, copy from `apps/mobile/.env.example`):**

| Variable | Required | Purpose |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Same Supabase project as web |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Same anon key as web |
| `EXPO_PUBLIC_WEB_URL` | Yes | Web app origin — mobile Settings hands off to the web app's `/settings/export` route (data export logic isn't duplicated as an Edge Function) |

**Supabase Edge Function secrets** (set via `supabase secrets set`, not in any `.env` file — see `supabase secrets list` for current names, values are never visible via CLI):

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (auto-provided by the platform) plus `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (set by hand, required for `mint-livekit-token` and `moderate-participant` to work).

**Never commit real values.** `.env.example` files must stay placeholder-only — `apps/web/.env.example` was itself accidentally excluded from git for the entire project history until this was found and fixed (`e41b196`); double-check `.gitignore` scoping (both root and `apps/web/.gitignore`) before assuming an example file is tracked.

---

## Database summary

Full detail in `DATABASE.md`. Headline facts:

- **Provider:** Supabase Postgres. Live project ref `jnercugeinepkgmbxdvn`, region `us-west-2`, named "Yume" in the dashboard.
- **Schema source of truth:** `supabase/migrations/*.sql`, applied sequentially, 21 files as of this audit (`0001_init.sql` through `0021_custom_backgrounds.sql`).
- **30 tables total.** RLS is enabled and policy-scoped on 29 of them. **`subscription_entitlements` has RLS disabled** — a live, unfixed security gap, see `SECURITY.md`.
- **No local Postgres / no `supabase start`** works in this environment (no Docker) — all migration work happens directly against the live project via `supabase db push`. This means **there is no safe local sandbox to test migrations before they hit production data.** Be careful.
- **`packages/supabase-types/src/database.ts` is hand-maintained**, not generated (`pnpm run gen` in that package requires a local instance that doesn't exist here). It must be manually updated whenever a migration changes the schema — this has already lagged behind reality at least once (`subscription_entitlements` was never added to it at all).
- **`supabase/seed.sql`** (decoration assets + 8 room templates) is **not** applied automatically by `db push` — it was run by hand once against the live project via the Management API. If a fresh project is ever set up, this must be re-run manually.

---

## Authentication and authorization

- **Sign-up/sign-in:** email + password, magic link, and Anonymous Auth (guests). All via `@supabase/supabase-js`'s `auth` methods, wired in `apps/web/src/app/(auth)/actions.ts`.
- **Sign-out:** `signOutAction()` in `apps/web/src/app/(auth)/actions.ts` — **this existed since the very first phase but was never wired to a visible button until a recent fix** (`adb717f`, `AppNav` component). If you find another "the code exists but nothing calls it" gap like this, it's a known recurring pattern in this codebase — check for it before assuming a feature is missing.
- **Session refresh:** `apps/web/src/proxy.ts` (Next 16's renamed middleware), runs on every non-static request.
- **Route protection:** `requireUser()` / `requireProfile()` (`apps/web/src/lib/auth/session.ts`) called at the top of every protected Server Component page — redirects to `/sign-in` if unauthenticated. **Not** centralized in middleware.
- **Guest accounts:** Supabase Anonymous Auth, created at the moment someone clicks an invite link and types a display name (`apps/web/src/app/invite/[token]/actions.ts` → `join-room` Edge Function). Guests get `room_memberships.role = 'guest'`.
- **Roles:** `room_role` enum: `owner` / `moderator` / `member` / `guest`, scoped per-room (a user's role is different in every room they're in — there is no global admin role in this app). Checked everywhere via the `room_role(room_id, profile_id)` Postgres helper function (`supabase/migrations/0002_rls.sql`).
- **Ownership/moderation:** kick/ban/mute go through `moderate-participant` Edge Function (service-role, enforces a rank check — a moderator can't target the owner or another moderator). Room lock, invite creation/revocation, and most content moderation go through direct RLS-scoped client writes.
- **Known authorization gap:** the "requires owner approval" invite flow is incomplete — a guest hits `pending_approval` and there is genuinely no UI anywhere for an owner to approve them. Documented in the `join-room` Edge Function's own comments. This has been a known gap since Phase 2 and was never revisited.
- **Security-sensitive files:** `apps/web/src/lib/supabase/service-role.ts`, every `supabase/functions/*/index.ts`, every RLS-defining migration, `apps/web/src/app/room/[roomId]/games/game-dispatch.ts`.

---

## API and integrations

Full detail in `API_REFERENCE.md`. There is no conventional REST/GraphQL API — see there for why, and for the list of the 5 Edge Functions and every Next.js Route Handler/Server Action that acts as a de facto endpoint.

External integrations: **LiveKit Cloud** (voice/video, real project connected), **Spotify Web API + Web Playback SDK** (real Client ID/Secret configured, redirect URI setup on the Spotify dashboard side was flagged as needing manual confirmation and was never confirmed done), **YouTube IFrame API** (official, no key required for basic playback) **+ YouTube Data API v3** (search only, real key configured).

---

## Testing and verification

There is no automated test suite. See `TESTING.md` for the manual smoke-test checklist and the live-testing methodology that was actually used to find and fix bugs in this project (direct HTTP calls against the live Supabase REST/Auth/Edge Function endpoints using throwaway anonymous test accounts, cleaned up after each session). That methodology is the closest thing this project has to integration tests, and it is **not automated or repeatable** — it was done by hand, once, via `curl`.

---

## Deployment

Full detail in `DEPLOYMENT.md`. Headline: Vercel project `yume` (root directory set to `apps/web` via a direct Vercel API call, since `vercel project update` has no CLI flag for it — see `DEPLOYMENT.md` for the exact mechanism), GitHub auto-deploy connected (every push to `main` deploys to production automatically, no staging/preview gate). Supabase migrations are a **separate, manual step** (`supabase db push`) — they are not part of the Vercel build and do not happen automatically on deploy.

---

## DO NOT CHANGE WITHOUT REVIEW

- **Any already-applied migration file** (`supabase/migrations/0001` through `0021` as of this audit). These have run against the live database. Editing an old migration file does nothing to the live schema and creates a mismatch between the file and reality — always add a **new** migration instead. (This project already made this exact mistake distinction correctly once mid-session: `0009_phase5_rls.sql` was edited in place *only* because it had never successfully applied; once migrations succeed, they become append-only.)
- **`supabase/migrations/0002_rls.sql`, `0016_moderation_rls.sql`, `0018`–`0020`** — the core RLS policies. This project has a proven track record of RLS bugs with real security/functional impact (guest join was completely broken, room creation was completely broken, first-login was completely broken — all three from RLS gaps, all found only by live testing). Any RLS change should be tested against the live project with a real request before being trusted.
- **`apps/web/src/lib/supabase/service-role.ts` and any code that imports it** — this bypasses every RLS policy in the database. New usages need the same scrutiny as a new RLS policy.
- **`packages/supabase-types/src/database.ts`** — must stay in sync with the migrations by hand. A mismatch doesn't fail loudly; it just produces silently-wrong TypeScript types.
- **`turbo.json`'s `build.env` list** — if a new server-only secret env var is added, it must be added here too, or Turborepo's cache won't invalidate when that secret changes (stale-secret risk, already fixed once this session).
- **`.gitignore` (both root and `apps/web/.gitignore`)** — this repo already had a real incident where `apps/web/.env.example` was silently excluded from the entire repo history due to an overly broad pattern in the nested `.gitignore`. Check both files, not just the root one, before assuming something is or isn't tracked.
- **Vercel project settings (Root Directory, Build Command)** — these were hand-configured via direct API calls to work around a real monorepo/Vercel CLI limitation (see `DEPLOYMENT.md`). Don't "fix" them back to Vercel's auto-detected defaults; that breaks the build.
- **`supabase/functions/*/index.ts` — the `npm:` import style.** These are Deno files, not Node — they cannot `import` from `packages/*` (different module resolution). Shared logic is intentionally duplicated with an explanatory comment where needed (see `game-actions/index.ts`).
- **LiveKit token minting (`mint-livekit-token`) and the LiveKit API secret.** Never let the LiveKit API secret reach client code.
- **Payments/billing:** `subscription_entitlements` table and the general "premium tier" infrastructure is schema-only, deliberately inactive, and has **no application code touching it at all** (verified via full-repo grep). Do not wire it up without a deliberate product decision — and fix its RLS gap first regardless (see `SECURITY.md` `SEC-001`).

---

## Known issues

See `TASKS.md` "Bugs" section for the full, structured list with IDs. Headline items:

1. **`subscription_entitlements` has RLS disabled on the live database.** Severity: Low-real-impact-but-High-in-principle (no app code reads this table, so nothing is *currently* exploitable for gain, but any authenticated user can write arbitrary rows to it right now). Status: found, not fixed, documented here and in `SECURITY.md`/`TASKS.md` (`SEC-001`).
2. **Owner-approval invite flow is incomplete.** A guest can get stuck at `pending_approval` with no way for the owner to ever approve them. Status: known gap since Phase 2, never revisited, not scheduled.
3. **No automated tests, no CI.** Every "verification" in this project's history has been manual (`typecheck`/`lint`/`build` plus hand-run `curl` tests against live infrastructure). Status: accepted risk so far, not scheduled to change.
4. **Face-tracked camera accessories (web) have never been visually tuned against a real camera** in this build environment — the landmark math is written against MediaPipe's documented indices but unverified in practice. Status: known gap, `apps/web/src/lib/camera-effects/face-accessories.ts`.
5. **Spotify redirect URI** — the production callback URL (`https://yume-gray.vercel.app/spotify/callback`) needs to be added in the Spotify Developer Dashboard by the project owner; this was flagged as needing confirmation and was **never confirmed done**. If Spotify connect fails with a redirect-mismatch error, this is why.
6. **iOS has never been built.** No EAS build, no TestFlight, no App Store submission. `eas.json` has no `submit` block (needs a real Apple Developer account to configure correctly).

---

## AI working instructions

Every future session, in order:

1. Read `CLAUDE.md` (this file).
2. Read `PROJECT_STATE.md`.
3. Read `TASKS.md`.
4. Read whichever of `ARCHITECTURE.md` / `FEATURES.md` / `DATABASE.md` / `API_REFERENCE.md` / `SECURITY.md` is relevant to the task at hand.
5. Inspect the actual code you're about to touch — don't trust a doc file over the code if they've drifted; fix the doc.
6. Run `git status` before changing anything.
7. Don't overwrite unrelated work — this repo has a track record of large, multi-hour sessions; check for in-progress changes.
8. Make small, reviewable changes. Prefer one concern per commit.
9. Run `pnpm run typecheck` and `pnpm run lint` (per affected app) after changes — there are no automated tests to run, so these plus a manual smoke-test (see `TESTING.md`) are the whole safety net.
10. Update the relevant memory files (`PROJECT_STATE.md`, `TASKS.md`, `SESSION_LOG.md`, and any feature/architecture doc that changed) after meaningful work — see "Permanent rules for future development" below.
11. Never claim something works without actually verifying it — this project has a specific, proven history of confidently-written code (never tested against live infra) turning out to be broken in ways `typecheck`/`lint`/`build` cannot catch (see `DECISIONS.md` for four real examples). Prefer a live test (direct `curl` against the Supabase project, using a disposable anonymous test account, cleaned up after) over an assumption, for anything touching RLS, Server Actions with `RETURNING`-style `.select()` chains, or cross-system side effects.
12. Never expose secrets — not in commits, not in documentation, not in chat-facing output.
13. Never modify the live production database or Supabase project without explicit user permission for that specific action (this project's Supabase project **is** production — there is no staging database).
14. Never perform destructive database operations (`DROP`, `DELETE` without a `WHERE`, `TRUNCATE`) without explicit permission.
15. Never silently replace an established pattern (Server Actions vs. direct RLS writes, the three-Supabase-client convention, the Zod-schema-per-domain convention, etc.) with a new one without calling it out.
16. Never remove a dependency without checking all usages across both apps and all packages first (`grep -r` for the import).
17. Never casually change authentication, database schema, deployment configuration, payments, or security rules — these categories have already caused real incidents in this project's history.
18. Record unresolved uncertainty explicitly in the docs rather than guessing or leaving it implicit.

### Permanent rules for future development

**Before every meaningful coding task:** read `CLAUDE.md`, `PROJECT_STATE.md`, `TASKS.md`, the relevant technical doc; check `git status`; inspect the files you're about to change; confirm the work isn't already done; preserve unrelated work; identify risk before touching anything security/schema/deployment-sensitive.

**After every meaningful coding task:** update `PROJECT_STATE.md`; update `TASKS.md`; append an entry to `SESSION_LOG.md`; update whichever of `FEATURES.md`/`ARCHITECTURE.md`/`API_REFERENCE.md`/`DATABASE.md`/`TESTING.md`/`DEPLOYMENT.md`/`SECURITY.md` is affected; remove or correct anything that's now stale; record any real architectural decision in `DECISIONS.md`; run `typecheck`/`lint`/`build` for whatever you touched; clearly record anything you could not verify. This repository is the permanent project memory — treat every doc file as load-bearing, not optional busywork.
