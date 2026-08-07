# TESTING.md — Testing & Verification Reference

## Current test strategy

**There is no automated test suite.** No test framework is installed (no Jest, Vitest, Playwright, Cypress, Detox — verified via `package.json` inspection across all workspaces and a full-repo filename search for `*.test.*`/`*.spec.*`, zero results). No CI exists (no `.github/workflows`). The `test` script in the root `package.json` (`turbo run test`) is a no-op today because no package declares a `test` script.

The closest thing this project has to integration testing is a **manual, ad-hoc methodology developed during this project's live-hardening session**: direct HTTP calls (via `curl`) against the live Supabase project's REST/Auth/Edge-Function endpoints, using disposable anonymous test accounts created and cleaned up within the same session. This found and fixed 4 real bugs that `typecheck`/`lint`/`build` could not have caught (all 4 were runtime RLS/browser-policy issues, not type errors). **This methodology is not automated, not repeatable as a single command, and was performed by hand.** A future session repeating it should:

1. Sign up a fresh anonymous Supabase user via `POST {SUPABASE_URL}/auth/v1/signup` with `{"data": {}}`.
2. Create a `profiles` row for it, then exercise whatever flow needs testing via direct REST calls (`{SUPABASE_URL}/rest/v1/<table>`) or Edge Function calls (`{SUPABASE_URL}/functions/v1/<name>`), always with `Authorization: Bearer <that user's access_token>`.
3. **Clean up afterward** — delete test `auth.users` rows (cascades most test data), being careful of tables with `on delete no action`/`restrict` FKs that need deleting in dependency order first (e.g. `room_templates`/`room_invites` reference `profiles` without cascade).
4. Never touch the one real user account (`garywangsmes@gmail.com`) or its real room.

This is genuinely the most reliable verification tool available in this project's current state — prefer it over assuming code is correct, especially for anything touching RLS.

## Test directory structure

None exists.

## Commands

```bash
# Typecheck (the closest thing to a compile-time safety net)
cd apps/web && pnpm run typecheck
cd apps/mobile && pnpm run typecheck

# Lint (web only — mobile has no lint script)
cd apps/web && pnpm run lint

# Build (also runs TypeScript checking internally via `next build`)
cd apps/web && pnpm run build

# All of the above at once
pnpm exec turbo run typecheck lint build
```

All four passed cleanly at the time of this audit. **None of them catch RLS bugs, browser-policy interactions, or any runtime/data logic issue** — see the 4 real bugs in `DECISIONS.md`, none of which would have been caught by any command above.

## Coverage gaps (everything, essentially)

No automated coverage of: authentication flows, room CRUD, invite/join flows, chat, canvas, drawing, notes, timers, study mode, YouTube, Spotify, any of the 3 games, moderation actions, snapshot/sharing, account deletion, data export, or any mobile screen. Live-tested-by-hand-once (not automated, not re-run on every change): room canvas CRUD, chat, notes/timer creation, the full Tic-Tac-Toe flow, drawing layer, moderation (mute/kick/ban), LiveKit token minting, YouTube's database layer + the autoplay fix, guest join, room creation, first-login.

## Critical untested flows

- Screen sharing (real two-browser WebRTC test never performed)
- Spotify OAuth + Web Playback SDK (needs a real Premium account)
- Camera effects visually verified against a real camera
- Any native mobile build (no Xcode/EAS run ever)
- Trivia and Draw & Guess games individually (Tic-Tac-Toe was tested as the representative case; the shared dispatch mechanism gives some confidence, but the games' own move-validation logic hasn't been individually exercised)
- Study mode
- Account deletion, data export
- Multi-person concurrent usage (2+ real people, camera + screen-share + YouTube + Spotify simultaneously)
- The owner-approval invite flow (**known broken**, not just untested — see `TASKS.md` `BUG-002`)

## Manual smoke-test checklist

Run through this after any change to auth, rooms, invites, or RLS policies — the areas with a proven history of live-only bugs.

### Auth
- [ ] Sign up with a new email/password → confirm email flow works
- [ ] Sign in with existing credentials
- [ ] Sign out (click the nav bar's Sign out button — confirm it actually ends the session and redirects to `/sign-in`, not just visually)
- [ ] Magic link sign-in
- [ ] Password reset flow end to end

### Rooms & invites
- [ ] Create a room from `/rooms`
- [ ] Room appears in the list, has the correct owner role badge
- [ ] Create an invite link (no password)
- [ ] Open the invite link in an incognito window, join as a guest (just a display name, no account)
- [ ] Confirm the guest lands in the room with their own distinct camera bubble/identity
- [ ] Create a password-protected invite, confirm join fails with the wrong password and succeeds with the right one
- [ ] Lock the room, confirm a new invite-link join is rejected with a clear message; confirm existing members can still enter
- [ ] Ban a member, confirm they cannot rejoin via the same invite link

### Real-time call
- [ ] Two different browsers/devices join the same room
- [ ] Both can hear/see each other (mic + camera)
- [ ] Dragging a camera bubble farther away noticeably lowers the other person's volume (spatial audio)
- [ ] Screen share works from one participant, is visible to the other
- [ ] Camera effects (filters at minimum) apply and are visible to the other participant

### Multi-user live call (the single most important untested scenario — `TASKS.md` `TEST-001`)
- [ ] With two people already in a call, one starts screen sharing
- [ ] Simultaneously, someone adds a YouTube video and it plays (and is audible) for both
- [ ] Simultaneously, someone connects Spotify and starts playback
- [ ] Confirm no feature breaks, freezes, or silently stops the others

### Canvas, drawing, notes, chat
- [ ] Drag a decoration onto the canvas, move it, delete it — confirm it syncs to a second connected client
- [ ] Draw a stroke, confirm it appears for the other participant; lock the layer, confirm drawing is blocked; clear the layer
- [ ] Add a sticky note, edit it, confirm sync
- [ ] Send a chat message, react to it, upload an image, delete a message

### Games
- [ ] Start a Tic-Tac-Toe game with 2 players, play a full game to a win
- [ ] Confirm an out-of-turn move is rejected
- [ ] Start a Trivia game, answer a round, confirm scoring
- [ ] Start a Draw & Guess game, draw, confirm the other player can guess and the drawer never sees the word revealed to them by their own client (open devtools, confirm the word isn't in any client-visible state before reveal)

### Moderation
- [ ] Mute another participant (as moderator) — confirm a non-moderator gets rejected trying the same action
- [ ] Kick a participant, confirm they're removed and can rejoin with a fresh invite
- [ ] Report a message, confirm it shows up in the Safety dialog for the room owner
- [ ] Block a user, confirm their messages disappear from your own chat view

### Settings
- [ ] Update display name/avatar
- [ ] Upload a custom background, confirm it applies
- [ ] Download data export, confirm the file is valid JSON with real data
- [ ] (Careful — destructive) Account deletion, on a disposable test account only, never the real one

## Test accounts / fixtures

No committed test fixtures or seeded test accounts exist. The one real account in the database is a production user, not a fixture — do not use it for testing.

## Known flaky tests

None — there are no automated tests to be flaky.

## Pre-deployment checks

Given the app deploys automatically on every push to `main` (GitHub auto-deploy, no staging gate), the realistic pre-deployment check is: run `typecheck`/`lint`/`build` locally before pushing, and for anything touching RLS/auth/payments-adjacent code, run at least a minimal version of the manual `curl`-based live test described above **before** pushing, not after.
