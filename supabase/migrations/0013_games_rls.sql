-- Games need a stronger guarantee than every other room-scoped table so
-- far: "no client-trusted win conditions" (docs/phase-1/11-implementation-checklist.md
-- Phase 6) means a player must not be able to just call
-- `supabase.from('game_players').update({ score: 999 })` from browser
-- devtools and have it stick. RLS alone can't express per-game move
-- legality, so the design here is: clients can only ever *read*
-- game_sessions/game_events and toggle their own ready/connected flag on
-- game_players — every score change and game_sessions.state transition
-- happens through a Next.js Server Action using the service-role client,
-- after validating the move server-side (see
-- apps/web/src/app/room/[roomId]/games/*). Enabling RLS with no
-- insert/update policy on a table is exactly "service role only," same
-- pattern as spotify_connections having zero client policies.

alter table game_sessions enable row level security;

create policy "room members can read game sessions"
on game_sessions for select
using (room_role(room_id, auth.uid()) is not null);

create policy "room members can start a game"
on game_sessions for insert
with check (room_role(room_id, auth.uid()) is not null);

-- No update policy: status/state transitions are server-validated only.

alter table game_players enable row level security;

create policy "room members can read game players"
on game_players for select
using (
  exists (
    select 1 from game_sessions s
    where s.id = session_id and room_role(s.room_id, auth.uid()) is not null
  )
);

create policy "member can join a game as themselves"
on game_players for insert
with check (
  profile_id = auth.uid()
  and exists (
    select 1 from game_sessions s
    where s.id = session_id and room_role(s.room_id, auth.uid()) is not null
  )
);

create policy "player can update their own row"
on game_players for update
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- Row-level policy above would otherwise let a player set their own
-- `score` too — column-level grants close that specific gap: only
-- is_ready/connected are writable by ordinary clients, regardless of
-- what a hand-crafted request tries to include in the same UPDATE.
revoke update on game_players from authenticated;
grant update (is_ready, connected) on game_players to authenticated;

alter table game_events enable row level security;

create policy "room members can read game events"
on game_events for select
using (
  exists (
    select 1 from game_sessions s
    where s.id = session_id and room_role(s.room_id, auth.uid()) is not null
  )
);

-- No insert policy: game_events is an append-only server-written log
-- (move history for spectating/reconnect replay), not client-writable.
