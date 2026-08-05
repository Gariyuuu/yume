-- RLS for the Phase 5 tables (room chat, media sync, timers, study mode).
-- Same room_role() pattern as every prior phase's room-scoped tables.

alter table room_messages enable row level security;

create policy "room members can read messages"
on room_messages for select
using (room_role(room_id, auth.uid()) is not null);

create policy "room members can send messages"
on room_messages for insert
with check (room_role(room_id, auth.uid()) is not null and author_id = auth.uid());

create policy "author or moderator can soft-delete messages"
on room_messages for update
using (author_id = auth.uid() or room_role(room_id, auth.uid()) in ('owner', 'moderator'));

alter table message_reactions enable row level security;

create policy "room members can read reactions"
on message_reactions for select
using (
  exists (
    select 1 from room_messages m
    where m.id = message_id and room_role(m.room_id, auth.uid()) is not null
  )
);

create policy "room members can react"
on message_reactions for insert
with check (
  profile_id = auth.uid()
  and exists (
    select 1 from room_messages m
    where m.id = message_id and room_role(m.room_id, auth.uid()) is not null
  )
);

create policy "reaction owner can remove their reaction"
on message_reactions for delete
using (profile_id = auth.uid());

alter table media_sessions enable row level security;

create policy "room members can read media session"
on media_sessions for select
using (room_role(room_id, auth.uid()) is not null);

create policy "room members can create media session"
on media_sessions for insert
with check (room_role(room_id, auth.uid()) is not null);

create policy "room members can update media session per control mode"
on media_sessions for update
using (
  case
    when control_mode = 'host_only' then room_role(room_id, auth.uid()) in ('owner', 'moderator')
    else room_role(room_id, auth.uid()) is not null
  end
);

alter table media_queue_items enable row level security;

create policy "room members can read queue items"
on media_queue_items for select
using (
  exists (
    select 1 from media_sessions s
    where s.id = session_id and room_role(s.room_id, auth.uid()) is not null
  )
);

create policy "room members can manage queue items"
on media_queue_items for all
using (
  exists (
    select 1 from media_sessions s
    where s.id = session_id and room_role(s.room_id, auth.uid()) is not null
  )
)
with check (
  exists (
    select 1 from media_sessions s
    where s.id = session_id and room_role(s.room_id, auth.uid()) is not null
  )
);

alter table study_sessions enable row level security;

create policy "room members can read study session"
on study_sessions for select
using (room_role(room_id, auth.uid()) is not null);

create policy "room members can manage study session"
on study_sessions for all
using (room_role(room_id, auth.uid()) is not null)
with check (room_role(room_id, auth.uid()) is not null);

alter table timers enable row level security;

create policy "room members can read timers"
on timers for select
using (room_role(room_id, auth.uid()) is not null);

create policy "room members can create timers"
on timers for insert
with check (room_role(room_id, auth.uid()) is not null);

create policy "timer owner or moderator can update or delete"
on timers for update
using (
  mode = 'shared' and room_role(room_id, auth.uid()) is not null
  or owner_id = auth.uid()
  or room_role(room_id, auth.uid()) in ('owner', 'moderator')
);

create policy "timer owner or moderator can delete"
on timers for delete
using (owner_id = auth.uid() or room_role(room_id, auth.uid()) in ('owner', 'moderator'));

-- Revises the Phase 1 plan (docs/phase-1/04-security-rls.md §5, "only
-- Edge Functions touch this table"): Spotify OAuth is implemented as
-- Next.js Route Handlers/Server Actions rather than a separate Edge
-- Function (consistent with the rest of the app's server-side code, and
-- the Web Playback SDK needs the browser to hold a live access token
-- anyway — see apps/web/src/app/spotify/callback/route.ts). Tokens are
-- still never selectable by anyone except the row's own owner, and never
-- touched by client-side Supabase calls directly.

create policy "user can manage their own spotify connection"
on spotify_connections for all
using (profile_id = auth.uid())
with check (profile_id = auth.uid());
