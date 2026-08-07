# API_REFERENCE.md — Server Actions, Route Handlers, Edge Functions

There is no conventional REST/GraphQL API in this project (see `ARCHITECTURE.md` ADR-001 in `DECISIONS.md`). Three categories of server-side entry point exist instead:

1. **Next.js Server Actions** (`"use server"` files) — callable only from the web app's own React components, not a public URL. Listed below by file.
2. **Next.js Route Handlers** (`route.ts` files) — real URLs, used for OAuth callbacks and one data-export download link.
3. **Supabase Edge Functions** (`supabase/functions/*/index.ts`) — real HTTP URLs (`https://jnercugeinepkgmbxdvn.supabase.co/functions/v1/<name>`), callable from both web and mobile, and the only backend code mobile has access to.

Everything else in the app talks directly to Postgres via RLS-scoped Supabase client calls — not listed here (see `DATABASE.md` for the tables those calls touch).

---

## Supabase Edge Functions (real HTTP endpoints)

### `join-room`
- **Path:** `/functions/v1/join-room`
- **Methods:** `GET` (preview, `?token=`) and `POST` (join)
- **Source:** `supabase/functions/join-room/index.ts`
- **Auth:** `GET` — none required. `POST` — requires a valid Supabase session JWT (`Authorization: Bearer <jwt>`), including anonymous-guest sessions.
- **Purpose:** The only place invite tokens are validated. `GET` returns room name + whether a password/approval is required, without joining. `POST` validates the token (expiry/revocation/max-uses/password), checks bans, checks room lock, applies rate limiting, lazily creates the caller's `profiles` row if missing, and inserts their `room_memberships` row.
- **Request body (POST):** `{ token: string, password?: string }`
- **Response:** `{ status: "joined", room_id } | { status: "pending_approval", room_id } | { status: "error", reason: "invalid_token"|"expired"|"revoked"|"wrong_password"|"room_full"|"banned"|"room_locked"|"rate_limited"|"join_failed" }`
- **Side effects:** inserts `profiles` (if missing), `room_memberships`; updates `room_invites.use_count`.
- **Known issues:** `pending_approval` is a genuine dead end — see `TASKS.md` `BUG-002`.

### `mint-livekit-token`
- **Path:** `/functions/v1/mint-livekit-token`
- **Method:** `POST`
- **Source:** `supabase/functions/mint-livekit-token/index.ts`
- **Auth:** requires a valid session JWT; verifies the caller is a member of the requested room before minting a token.
- **Request body:** `{ room_id: string }`
- **Response:** `{ token: string, url: string, identity: string }` — a signed LiveKit JWT (HS256, `iss` = `LIVEKIT_API_KEY`), the LiveKit server URL, and the caller's LiveKit identity (= their `profile_id`).
- **Side effects:** none (read-only besides the mint).
- **Verified live:** yes — returns a correctly-shaped, correctly-signed token (checked by decoding the JWT payload).
- **Secrets used:** `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (Edge Function secrets, never exposed to any client).

### `moderate-participant`
- **Path:** `/functions/v1/moderate-participant`
- **Method:** `POST`
- **Source:** `supabase/functions/moderate-participant/index.ts`
- **Auth:** requires a session JWT; caller must be `owner`/`moderator` in the target room, and cannot target the room owner or (if caller is a moderator) another moderator.
- **Request body:** `{ room_id: string, target_profile_id: string, action: "mute"|"kick"|"ban", reason?: string }`
- **Response:** `{ status: "muted"|"kicked"|"banned" } | { error: string }`
- **Side effects:** `mute` → LiveKit `mutePublishedTrack` + `audit_logs` insert. `kick`/`ban` → LiveKit `removeParticipant` + delete `room_memberships` + (`ban` only) insert `room_bans` + `audit_logs` insert.
- **Verified live:** yes — mute (authorization rejection for non-moderators), kick (membership removal + correctly-joined audit log), and ban (confirmed to actually block a subsequent rejoin) were all tested end to end.

### `game-actions`
- **Path:** `/functions/v1/game-actions`
- **Method:** `POST`
- **Source:** `supabase/functions/game-actions/index.ts`
- **Auth:** requires a session JWT; caller must be a player in the session.
- **Purpose:** Mobile's equivalent of the web app's `game-dispatch.ts` — **Tic-Tac-Toe only** (the engine logic is duplicated here in Deno-compatible form, since Edge Functions can't import `packages/game-sdk`).
- **Request body:** `{ action: "start"|"rematch"|"move", session_id: string, cell_index?: number }`
- **Response:** `{ state: TicTacToeState } | { error: string }`
- **Verified live:** yes — full create/join/ready/start/move flow tested, including correct rejection of an out-of-turn move.
- **Known issues:** if Tic-Tac-Toe's rules ever change in `packages/game-sdk/src/tic-tac-toe.ts`, this file must be updated by hand to match (`FILE_MAP.md`).

### `delete-account`
- **Path:** `/functions/v1/delete-account`
- **Method:** `POST`
- **Source:** `supabase/functions/delete-account/index.ts`
- **Auth:** requires a session JWT — re-verifies the token server-side and only ever deletes the user it identifies (never a client-supplied ID).
- **Purpose:** Deletes the `auth.users` row (cascades to `profiles` and everything FK'd to it) — requires service-role since deleting an `auth.users` row can't be done through client-side RLS.
- **Not live-tested this pass.**

---

## Next.js Route Handlers (real URLs, web app only)

| Path | File | Purpose |
|---|---|---|
| `/auth/callback` | `apps/web/src/app/auth/callback/route.ts` | Supabase auth callback (email confirmation / magic link redirect target) |
| `/spotify/connect` | `apps/web/src/app/spotify/connect/route.ts` | Starts the Spotify OAuth Authorization Code flow |
| `/spotify/callback` | `apps/web/src/app/spotify/callback/route.ts` | Spotify OAuth callback — exchanges code for tokens, writes `spotify_connections` |
| `/settings/export` | `apps/web/src/app/settings/export/route.ts` | Downloads a JSON bundle of the caller's data (`profile`, `room_memberships`, `owned_room_objects` — explicitly flagged in its own comment as needing wider coverage). Also the target mobile's Settings screen hands off to via `Linking.openURL`. |

---

## Next.js Server Actions (by file)

Not real URLs — these are RPC-style functions the React tree calls directly; Next.js handles the wire protocol. Listed by file with the exported function names and one-line purpose. All require the caller to have a valid session unless noted; most additionally check room membership/role via the RLS-scoped client they use internally.

| File | Exports | Purpose |
|---|---|---|
| `apps/web/src/app/(auth)/actions.ts` | `signUpAction`, `signInAction`, `signOutAction`, `requestPasswordResetAction`, `updatePasswordAction` | Auth lifecycle. `signOutAction` is called from `apps/web/src/components/app-nav.tsx` — this was missing a caller entirely until recently, see `DECISIONS.md`. |
| `apps/web/src/app/rooms/actions.ts` | `createRoomAction` | Room creation. |
| `apps/web/src/app/room/[roomId]/actions.ts` | `createInviteAction`, `revokeInviteAction`, `updateRoomAudioModeAction`, `updateOwnStatusAction` | Invite management, room settings. |
| `apps/web/src/app/room/[roomId]/decoration-actions.ts` | bulk room-object operations | Canvas persistence helpers (uses `content as any` for the jsonb/discriminated-union type gap — documented). |
| `apps/web/src/app/room/[roomId]/version-actions.ts` | version-restore wrapper around `restore_room_version` RPC | Room history restore. |
| `apps/web/src/app/room/[roomId]/livekit-actions.ts` | `muteParticipantAction`, `kickParticipantAction`, `banParticipantAction` | Thin wrappers calling the `moderate-participant` Edge Function. |
| `apps/web/src/app/room/[roomId]/moderation-actions.ts` | `reportAction`, `resolveReportAction`, `toggleRoomLockAction`, `blockUserAction`, `unblockUserAction` | Plain RLS-scoped moderation actions (no service-role needed — single-table writes). |
| `apps/web/src/app/room/[roomId]/youtube-actions.ts` | `searchYouTubeAction` | YouTube Data API v3 search (needs `YOUTUBE_API_KEY`; returns a clear error without one — paste-URL playback doesn't need this action at all). |
| `apps/web/src/app/room/[roomId]/spotify-actions.ts` | search/queue/token helpers | Spotify integration server-side pieces (`getSpotifyAccessTokenAction` is what the Web Playback SDK's `getOAuthToken` callback calls). |
| `apps/web/src/app/room/[roomId]/games/actions.ts` | `createGameAction`, `joinGameAction`, `readyUpAction`, `leaveGameAction`, `deleteGameAction` | Plain RLS-scoped game-session lifecycle (not the move-dispatch itself). |
| `apps/web/src/app/room/[roomId]/games/tic-tac-toe-actions.ts` | `startTicTacToeGameAction`, `rematchTicTacToeGameAction`, `makeTicTacToeMoveAction` | Serializable-args wrappers around `game-dispatch.ts`'s `startGameInternal`/`rematchInternal`/`applyGameMove`, bound to the Tic-Tac-Toe engine. |
| `apps/web/src/app/room/[roomId]/games/trivia-actions.ts` | `startTriviaGameAction`, `rematchTriviaGameAction`, `startTriviaRoundAction`, `answerTriviaAction`, `revealTriviaAction` | Same pattern for Trivia; `revealTriviaAction` is the only place that looks up the correct answer (from `trivia-questions.ts`, `server-only`). |
| `apps/web/src/app/room/[roomId]/games/draw-and-guess-actions.ts` | `startDrawAndGuessGameAction`, `rematchDrawAndGuessGameAction`, `startDrawRoundAction`, `submitGuessAction`, `revealDrawAction` | Same pattern for Draw & Guess; the secret word lives in `game_round_secrets` (service-role only table), never in client-visible state. |
| `apps/web/src/app/settings/actions.ts` | `updateProfileAction`, `signOutOtherSessionsAction`, `deleteAccountAction` | Profile update; `deleteAccountAction` calls the `delete-account` Edge Function. |
| `apps/web/src/app/invite/[token]/actions.ts` | `joinRoomAction` | The client-facing wrapper that calls `join-room` (either signs the user in anonymously first if they're a guest, or uses their existing session), and maps every `reason` value to a human-readable error message. |

### The `game-dispatch.ts` choke point (not a Server Action itself)

`apps/web/src/app/room/[roomId]/games/game-dispatch.ts` — `import "server-only"`, **not** `"use server"`, cannot be called directly from a Client Component. Exports `startGameInternal`, `rematchInternal`, `getGameState`, `applyGameMove` — all take a `GameEngine` parameter (which has function properties, disqualifying it from being a Server Action argument — see `DECISIONS.md` ADR-002). Every actual move in every game funnels through `applyGameMove`, which always re-reads authoritative state from the database with a service-role client and re-runs the pure engine function server-side — **the client's claimed state is never trusted**, which is what "no client-trusted win conditions" (an explicit original requirement) actually means in this codebase.

---

## Example: a real request/response pair (verified live, values redacted appropriately)

`POST https://jnercugeinepkgmbxdvn.supabase.co/functions/v1/join-room`

Request:
```
Headers: apikey: <publishable key>, Authorization: Bearer <session JWT>, Content-Type: application/json
Body: {"token": "abc123..."}
```

Response (success):
```json
{"status": "joined", "room_id": "e9132022-4bf5-4236-a674-22da947cc954"}
```

Response (banned):
```json
{"status": "error", "reason": "banned"}
```

No example includes a real secret value — the `apikey`/`Authorization` values above are placeholders, not the project's actual keys.
