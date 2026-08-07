# FILE_MAP.md — Practical Repository Map

Paths are relative to repo root. This lists files a future coding agent is actually likely to touch — not every generated or trivial file. Trivial UI primitives in `apps/web/src/components/ui/` (shadcn components: `button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`, `badge.tsx`, `separator.tsx`, `tabs.tsx`, `sonner.tsx`) are omitted individually; they're low-risk, mostly-generated styling wrappers.

---

## Entry points and app shell

| Path | Purpose | Risk if edited carelessly |
|---|---|---|
| `apps/web/src/app/layout.tsx` | Root layout — fonts, mounts `<Starfield/>` and `<Toaster/>` | Low — but removing `Starfield` kills the background for every page |
| `apps/web/src/app/page.tsx` | `/` — redirects to `/rooms` or `/sign-in` based on session | Low |
| `apps/web/src/proxy.ts` | Next 16 middleware equivalent — refreshes session cookie on every request | **High** — breaking this silently logs everyone out on every navigation |
| `apps/mobile/App.tsx` | Mobile root — hand-rolled screen switching (no nav library) | Medium — adding a screen means adding a `useState` branch here |
| `apps/web/src/app/globals.css` | All theme tokens, neon palette, background image reference, animation keyframes | Medium — this is the *only* place theme colors are defined; changing `--background`/`--card`/etc. here changes the whole app |

## Auth

| Path | Purpose | Risk |
|---|---|---|
| `apps/web/src/app/(auth)/actions.ts` | Sign-up, sign-in, magic-link, `signOutAction()`, password reset Server Actions | **High** — auth-critical |
| `apps/web/src/lib/auth/session.ts` | `requireUser()`/`requireProfile()` — the actual route-protection mechanism, called at the top of every protected page | **High** |
| `apps/web/src/lib/supabase/client.ts` / `server.ts` / `service-role.ts` | The three Supabase client constructors — browser/RLS, SSR/RLS, service-role/bypasses-RLS | **High** — never let a service-role client leak to a Client Component |
| `apps/mobile/src/lib/supabase.ts` | Mobile's single Supabase client (RLS-scoped, `AsyncStorage`-backed session) | High |
| `apps/mobile/src/screens/AuthScreen.tsx` | Mobile sign-in/sign-up UI | Medium |

## Rooms core

| Path | Purpose | Risk |
|---|---|---|
| `apps/web/src/app/rooms/page.tsx`, `actions.ts`, `create-room-form.tsx` | Room list + creation | Medium |
| `apps/web/src/app/room/[roomId]/page.tsx` | The room page — loads room/membership/objects/assets/templates, renders every feature dialog in its header | **High** — the most central file in the web app; almost every feature's entry point is wired here |
| `apps/web/src/app/room/[roomId]/actions.ts` | Invite creation, `revokeInviteAction`, audio-mode toggle | Medium |
| `apps/web/src/app/room/[roomId]/decoration-actions.ts` | Room object bulk operations | Medium |
| `apps/web/src/components/room-stage.tsx` | Composes canvas + call controls + presence + all the header dialogs for the room page's `<main>` | High — central composition point |
| `apps/web/src/components/room-canvas/room-canvas.tsx` | The Konva decoration canvas — select/drag/resize/rotate/duplicate/lock/layer/undo-redo/snap-to-grid | High, large file |
| `apps/web/src/components/room-canvas/use-autosave.ts`, `use-undo-redo.ts` | Autosave-to-`room_versions` and local undo/redo stacks | Medium |
| `apps/mobile/src/components/RoomCanvasView.tsx` | Mobile's Skia canvas — deliberately thinner (single-drag, tap-hold-delete, no multi-select/resize) | Medium |
| `apps/mobile/src/screens/RoomDetailScreen.tsx` | Mobile room screen — composes call/chat/games/canvas/snapshot | High for mobile |

## Real-time / presence / call

| Path | Purpose | Risk |
|---|---|---|
| `apps/web/src/lib/presence/use-room-presence.ts` | Presence channel — bubble position, camera/mic/speaking state | High — breaking this breaks every camera bubble |
| `apps/web/src/lib/live/use-live-broadcast.ts` | Tier-1 ephemeral broadcast (live drag/cursor) helper | Medium |
| `apps/web/src/components/call/call-controls.tsx` | Mic/camera/screen-share toggle buttons, camera-effects dialog trigger, sign-out is NOT here (see `app-nav.tsx`) | Medium |
| `apps/web/src/components/call/participant-bubbles-layer.tsx`, `participant-bubble.tsx` | DOM-overlay camera bubbles on top of the Konva canvas, moderation menu (mute/kick/ban/report/block) | High — moderation entry point |
| `apps/web/src/components/call/screen-share-strip.tsx` | Renders active screen-share tracks | Low |
| `apps/mobile/src/components/CallView.tsx`, `ParticipantTile.tsx`, `ParticipantMenu.tsx` | Mobile call UI + moderation menu | Medium |
| `supabase/functions/mint-livekit-token/index.ts` | The **only** place a LiveKit token is ever created | **High** — LiveKit API secret lives here |
| `supabase/functions/moderate-participant/index.ts` | Mute/kick/ban — service-role, rank-checked | **High** |

## Chat / notes / timers / study

| Path | Purpose | Risk |
|---|---|---|
| `apps/web/src/components/chat/*` | Chat panel, message item, use-room-chat hook (send/react/delete/upload) | Medium |
| `apps/web/src/components/notes/*` | Sticky/checklist/text notes | Medium |
| `apps/web/src/components/timers/*` | Shared/personal timers | Medium |
| `apps/web/src/components/study/*` | Pomodoro study mode, focus streaks, ambient noise, personal checklist | Medium |

## Media (YouTube / Spotify)

| Path | Purpose | Risk |
|---|---|---|
| `apps/web/src/lib/youtube.ts` | IFrame API loader, `YouTubePlayer` type, video-ID extraction | Medium — the autoplay-policy fix lives here (`playerVars: {mute:1}`) |
| `apps/web/src/components/youtube/*` | YouTube dialog, player view, session hook | Medium |
| `apps/web/src/app/room/[roomId]/youtube-actions.ts` | YouTube search Server Action (needs `YOUTUBE_API_KEY`) | Low |
| `apps/web/src/lib/spotify/*` | Spotify OAuth token helpers, Web Playback SDK loader | **High** — OAuth/secret handling |
| `apps/web/src/app/spotify/connect/route.ts`, `callback/route.ts` | Spotify OAuth flow | **High** |
| `apps/web/src/app/room/[roomId]/spotify-actions.ts` | Spotify search/queue/playback Server Actions | Medium |
| `apps/web/src/components/spotify/*` | Spotify dialog, player hook, session hook | Medium |

## Games

| Path | Purpose | Risk |
|---|---|---|
| `packages/game-sdk/src/*` | Pure game engines (Tic-Tac-Toe, Trivia, Draw & Guess) — no I/O, no secrets | Medium — changing engine logic changes rules for all three games' shared `applyMove` contract |
| `apps/web/src/app/room/[roomId]/games/game-dispatch.ts` | The single choke point every move goes through — service-role, re-reads authoritative state, never trusts client-claimed state | **High** |
| `apps/web/src/app/room/[roomId]/games/actions.ts`, `tic-tac-toe-actions.ts`, `trivia-actions.ts`, `draw-and-guess-actions.ts` | Thin, serializable-args Server Action wrappers around `game-dispatch.ts` | Medium |
| `apps/web/src/app/room/[roomId]/games/trivia-questions.ts`, `draw-and-guess-words.ts` | `import "server-only"` — secret content (answers/words) that must never reach the client bundle | **High** — moving this import or removing `"server-only"` could leak answers to the client |
| `supabase/functions/game-actions/index.ts` | Mobile's equivalent of `game-dispatch.ts` — **Tic-Tac-Toe only**, duplicates the engine logic (Deno can't import `packages/game-sdk`) | High — keep in sync with `packages/game-sdk/src/tic-tac-toe.ts` if that engine's rules ever change |
| `apps/web/src/components/games/*`, `apps/mobile/src/components/GamesModal.tsx`/`TicTacToeBoard.tsx` | Game UI | Medium |

## Camera effects (web only)

| Path | Purpose | Risk |
|---|---|---|
| `apps/web/src/lib/camera-effects/*` | MediaPipe pipeline, filters, background blur/replace, face accessories, frames, plugin registry | Medium — `registry.ts` is the extensibility point for adding new effects |
| `apps/web/src/components/camera-effects/use-camera-pipeline.ts` | The actual `requestAnimationFrame` render loop, publishes the processed canvas as a LiveKit track | High — performance-sensitive, easy to introduce a memory/GPU leak |

## Moderation / safety

| Path | Purpose | Risk |
|---|---|---|
| `apps/web/src/app/room/[roomId]/moderation-actions.ts` | Report, resolve-report, toggle-room-lock, block/unblock — plain RLS-scoped Server Actions | Medium |
| `apps/web/src/components/moderation/safety-dialog.tsx`, `report-dialog.tsx` | Moderation UI | Medium |
| `apps/web/src/components/app-nav.tsx` | The persistent Rooms/Settings/Sign-out nav bar — where `signOutAction()` is actually called from | Medium |

## Settings

| Path | Purpose | Risk |
|---|---|---|
| `apps/web/src/app/settings/page.tsx` | Settings page — profile, appearance, data export, blocked users, legal links, danger zone | Medium |
| `apps/web/src/app/settings/actions.ts` | Profile update, sign-out-other-sessions, `deleteAccountAction()` (calls `delete-account` Edge Function) | **High** — account deletion |
| `apps/web/src/app/settings/background-upload.tsx` | Custom background upload to `user-backgrounds` bucket | Low |
| `apps/web/src/app/settings/export/route.ts` | Data export Route Handler — also used by mobile via hand-off (see `EXPO_PUBLIC_WEB_URL`) | Medium |
| `apps/mobile/src/screens/SettingsScreen.tsx` | Mobile settings — account deletion, data export hand-off, blocked users, legal links | Medium |

## Shared packages

| Path | Purpose | Risk |
|---|---|---|
| `packages/room-schema/src/*.ts` | One Zod schema file per domain concept, re-exported via `index.ts` | High — a shape change here ripples through both apps' TypeScript |
| `packages/supabase-types/src/database.ts` | Hand-maintained `Database` type mirroring the Postgres schema | **High, and currently drifted** — `subscription_entitlements` is missing entirely (see `DATABASE.md`) |
| `packages/game-sdk/src/*` | See "Games" above | High |
| `packages/config/eslint-preset.js` | Shared lint rules for non-Next.js packages | Low |

## Supabase backend

| Path | Purpose | Risk |
|---|---|---|
| `supabase/migrations/0001_init.sql` | Full initial schema (27 tables, all enums) | **Never edit — already applied.** New changes go in a new migration file. |
| `supabase/migrations/0002_rls.sql` | Core RLS: `room_role()` helper, profiles/rooms/memberships/objects/messages/invites policies | **High**, never edit in place |
| `supabase/migrations/0016_moderation_rls.sql`, `0017_upload_restrictions.sql` | Phase 7 safety system RLS + rate limiting + storage restrictions | High |
| `supabase/migrations/0018`–`0020` | The three live-bug-fix migrations (profiles INSERT, rooms policy recreate, rooms owner-SELECT) — read these for the exact RETURNING/RLS interaction bug pattern | High, historically informative |
| `supabase/seed.sql` | Decoration assets + 8 room templates — **not auto-applied**, must be run by hand against a fresh project | Medium |
| `supabase/functions/join-room/index.ts` | Invite validation, ban check, room-lock check, rate limit, lazy profile creation, membership insert | **High** — the whole guest-join flow lives here |
| `supabase/functions/delete-account/index.ts` | Account deletion | **High** |

---

## Where to make common changes

- **Add a page (web):** new folder under `apps/web/src/app/`, add a `page.tsx`. If it needs the persistent nav bar, import and render `<AppNav current="...">` from `apps/web/src/components/app-nav.tsx` (extend its `current` union type if adding a genuinely new top-level page).
- **Add an API route (web):** a `route.ts` file under `apps/web/src/app/<path>/`, or — more idiomatic for this codebase — a Server Action in an `actions.ts` file colocated with the page that uses it. Prefer Server Actions unless you specifically need a URL other systems (webhooks, mobile hand-off) can hit directly.
- **Add a mobile screen:** create it under `apps/mobile/src/screens/`, then add a `useState` branch + conditional render in `apps/mobile/App.tsx` (there is no router).
- **Modify authentication:** `apps/web/src/app/(auth)/actions.ts` + `apps/web/src/lib/auth/session.ts`. Test the full flow live, not just typecheck — this project's auth-adjacent bugs have all been live-only.
- **Change the database schema:** add a new file `supabase/migrations/00XX_description.sql` (next sequential number). Run `npx supabase db push` to apply it to the live project. Update `packages/supabase-types/src/database.ts` by hand to match. Update `DATABASE.md`.
- **Add a feature that needs shared types:** add a schema file to `packages/room-schema/src/`, export it from `index.ts`.
- **Change themes/colors:** `apps/web/src/app/globals.css` — the `:root`/`.dark` CSS custom properties and the `@theme inline` block. Mobile has no shared token system; colors there are hardcoded hex in each `StyleSheet.create()` call.
- **Update deployment settings:** Vercel project settings were set via direct API calls, not the dashboard defaults — see `DEPLOYMENT.md` before touching Root Directory/Build Command.
- **Add an environment variable:** add it to the relevant `.env.example` (web or mobile) with a comment explaining it, add it to `CLAUDE.md`'s environment table, and if it's read at build time by a Server Action/Route Handler, add it to `turbo.json`'s `build.env` list so Turborepo's cache invalidates correctly.
- **Modify multiplayer/real-time behavior:** check which tier it belongs to first (`ARCHITECTURE.md` "Data flow") — ephemeral high-frequency state uses Broadcast (`use-live-broadcast.ts`, `use-draw-and-guess-canvas.ts`), everything else uses Postgres Changes subscriptions colocated in each feature's `use-<feature>.ts` hook.
- **Change game scoring/rules:** `packages/game-sdk/src/<game>.ts` for the pure logic. If it's Tic-Tac-Toe, **also** update the duplicated copy in `supabase/functions/game-actions/index.ts` (mobile's dispatch path) — these two must be kept in sync by hand.
- **Change permissions/roles:** the `room_role()` Postgres function and the RLS policies that call it, in the relevant `supabase/migrations/*.sql` file (new migration, never edit an applied one).
