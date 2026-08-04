# 04 — Security Model & Row Level Security

## 1. Roles

`room_role` enum: `owner` (creator, one per room, full control), `moderator`
(delegated by owner — kick/ban/delete others' content/manage invites),
`member` (full participation, no moderation authority), `guest` (joined via
invite link without an account — same participation rights as `member`
unless the owner restricts guests specifically, but cannot invite others or
own persistent objects across sessions in the same durable way).

A helper function centralizes role lookups so every policy reads the same
way:

```sql
create or replace function room_role(p_room_id uuid, p_profile_id uuid)
returns room_role
language sql stable security definer
set search_path = public
as $$
  select role from room_memberships
  where room_id = p_room_id and profile_id = p_profile_id
  limit 1;
$$;
```

`security definer` is required because a guest checking their own role must
be able to read `room_memberships` for permission checks even before their
own membership row is visible under a naive RLS policy — this function is
the single trusted chokepoint, not a bypass of RLS elsewhere.

## 2. Guest identity

Guests use **Supabase Anonymous Auth** (`signInAnonymously`), which issues
a real `auth.users` row and JWT — this means every RLS policy can key off
`auth.uid()` uniformly for both registered and guest users, with no
parallel guest-token system to maintain. On anonymous sign-in, an Edge
Function (`join-room`) is called with the invite token; it:

1. Validates the invite (not expired, not revoked, under capacity, correct
   password if set).
2. Creates the `profiles` row (`is_guest = true`, temporary display
   name/avatar supplied by the guest).
3. Creates the `room_memberships` row with role `guest`.
4. Increments `room_invites.use_count`.

If a guest later registers with an email (Supabase supports **linking** an
anonymous user to a permanent identity), their `profiles.id` stays the
same and `is_guest` flips to `false` — history, room memberships, and
authored objects carry over for free since nothing keyed off a separate
guest ID.

## 3. Invite link security

- `room_invites.token` is a cryptographically random URL-safe string
  (generated server-side, not derived from the room ID), so links aren't
  guessable/enumerable.
- Optional room password is hashed (bcrypt, via Edge Function using a
  service-role key) — `password_hash` is never readable by clients (see
  RLS below), and the plaintext password is only ever transmitted over TLS
  to the Edge Function for a one-time check, never stored.
- Expiry (`expires_at`), revocation (`revoked_at`), and capacity
  (`max_uses` / room `capacity`) are all enforced server-side in the
  `join-room` Edge Function, not trusted from the client.
- Invite validation is intentionally **not** a direct client → Postgres
  RLS-guarded read, because that would let anyone probe `room_invites` for
  metadata (existence, use counts). Clients only ever call the Edge
  Function with a token; the function itself uses the service role to look
  up and validate.

## 4. RLS policy pattern

General shape used across the room-scoped tables (`room_objects`,
`room_messages`, `room_notes`, `room_drawings`, `media_sessions`, `timers`,
`study_sessions`, `game_sessions`, ...): a row is readable if the caller
has *any* membership in the parent room, and writable based on the
specific permission for that table (owner-of-row, or role-based via
`interaction_permissions` for `room_objects`).

Representative policies (full set replicated per table during Phase 2 —
see [11-implementation-checklist.md](11-implementation-checklist.md)):

```sql
alter table rooms enable row level security;

create policy "members can read their rooms"
on rooms for select
using (
  exists (
    select 1 from room_memberships m
    where m.room_id = rooms.id and m.profile_id = auth.uid()
  )
);

create policy "owner can update room"
on rooms for update
using (owner_id = auth.uid());

alter table room_memberships enable row level security;

create policy "members can see other members of their rooms"
on room_memberships for select
using (room_role(room_id, auth.uid()) is not null);

create policy "owner or moderator can manage memberships"
on room_memberships for all
using (room_role(room_id, auth.uid()) in ('owner', 'moderator'))
with check (room_role(room_id, auth.uid()) in ('owner', 'moderator'));

alter table room_objects enable row level security;

create policy "members can read room objects"
on room_objects for select
using (room_role(room_id, auth.uid()) is not null);

create policy "members can insert objects if room allows"
on room_objects for insert
with check (room_role(room_id, auth.uid()) is not null);

create policy "owner, moderator, or object owner can update"
on room_objects for update
using (
  owner_id = auth.uid()
  or room_role(room_id, auth.uid()) in ('owner', 'moderator')
)
with check (
  owner_id = auth.uid()
  or room_role(room_id, auth.uid()) in ('owner', 'moderator')
);

alter table room_messages enable row level security;

create policy "members can read room messages"
on room_messages for select
using (room_role(room_id, auth.uid()) is not null);

create policy "members can send messages"
on room_messages for insert
with check (
  room_role(room_id, auth.uid()) is not null and author_id = auth.uid()
);

create policy "author or moderator can soft-delete"
on room_messages for update
using (
  author_id = auth.uid()
  or room_role(room_id, auth.uid()) in ('owner', 'moderator')
);

alter table room_invites enable row level security;

create policy "owner or moderator can manage invites"
on room_invites for all
using (room_role(room_id, auth.uid()) in ('owner', 'moderator'))
with check (room_role(room_id, auth.uid()) in ('owner', 'moderator'));
-- note: no public/anon select policy on room_invites at all — token
-- validation only ever happens through the join-room Edge Function using
-- the service role, per §3 above.
```

`room_objects.interaction_permissions` (jsonb, e.g.
`{"move": "member", "edit": "owner", "delete": "moderator"}`) is enforced
in application code / an RPC wrapper on top of the baseline RLS policy
above for finer-grained "owner-only objects" — RLS gives the coarse
room-membership boundary, the RPC gives the per-object permission nuance,
since expressing arbitrary jsonb-driven logic purely in a `using` clause
gets unreadable fast.

## 5. Sensitive tables — no direct client access

`spotify_connections` (OAuth tokens) has RLS enabled with **no policies at
all** for the anon/authenticated roles — it is only ever read/written by
Edge Functions using the service-role key. Same treatment for
`room_invites.password_hash`/token validation (§3) and for writing
`audit_logs` (clients can read logs for rooms they moderate, but only
Edge Functions/RPCs insert them, so the log can't be tampered with by the
actor being logged).

## 6. Storage (Supabase Storage)

Buckets: `room-assets` (public read, since decorations render for
everyone including via signed CDN URLs), `avatars` (public read),
`uploads` (room-scoped user uploads — images, drawing exports, snapshots).
`uploads` policies mirror the `room_objects` pattern: path convention
`uploads/{room_id}/{file}`, and a Storage RLS policy checks
`room_role(room_id, auth.uid()) is not null` using the same helper
function against the path prefix. Upload size limits and MIME-type
allowlists are enforced both client-side (fast feedback) and via a Storage
webhook/Edge Function (authoritative) — see "upload scanning" in
[11-implementation-checklist.md](11-implementation-checklist.md).

## 7. LiveKit token scoping

LiveKit access tokens are minted by an Edge Function, never on the client
(the API secret never leaves the server). The function:

1. Confirms the caller has a `room_memberships` row for the target room
   (same `room_role` check).
2. Mints a token scoped to that LiveKit room name (`room:{roomId}`) with
   grants derived from the caller's role — e.g. a `guest` in a
   presenter-restricted room might get `canPublish: false` until promoted.
3. Sets a short TTL; the client re-requests a token on reconnect rather
   than caching a long-lived one.

## 8. Rate limiting & abuse controls

- Edge Functions front the highest-abuse-risk writes (join-room, invite
  creation, report submission, message send from guests) with a simple
  per-`auth.uid()` sliding-window counter in Postgres (or Supabase's
  built-in rate limiting where available) — exact limits tuned in Phase 2
  once real usage patterns exist; the requirement is that a limit exists
  and is enforced server-side, not the specific number.
- File uploads are scanned for MIME-type/size at the Edge Function layer
  before a Storage object is marked usable in a room.

## 9. Account data rights

`profiles` deletion cascades (`on delete cascade`) to memberships, owned
objects transfer to room-null-owner state or are removed per room policy
(owner-only objects are deleted; shared objects persist with `owner_id`
set to null), and messages are soft-deleted (`deleted_at`) rather than
cascaded, preserving room history integrity for other members while
honoring the deletion request for the leaving user's identity. Data export
is a dedicated Edge Function that gathers a user's `profiles`, owned
`room_objects`, `room_messages`, and `room_memberships` rows into a
downloadable JSON bundle — required by the brief's "personal data export"
item and good practice regardless of jurisdiction-specific obligations.
