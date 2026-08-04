-- RLS for the core tables. See docs/phase-1/04-security-rls.md for the
-- full rationale. Remaining tables get equivalent room-scoped policies
-- during Phase 2 (tracked in docs/phase-1/11-implementation-checklist.md)
-- following the same room_role() pattern established here.

create or replace function room_role(p_room_id uuid, p_profile_id uuid)
returns room_role
language sql stable security definer
set search_path = public
as $$
  select role from room_memberships
  where room_id = p_room_id and profile_id = p_profile_id
  limit 1;
$$;

alter table profiles enable row level security;

create policy "anyone authenticated can read profiles"
on profiles for select
using (auth.role() = 'authenticated');

create policy "user can update own profile"
on profiles for update
using (id = auth.uid());

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

create policy "authenticated user can create room"
on rooms for insert
with check (owner_id = auth.uid());

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

create policy "members can insert objects"
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

create policy "owner, moderator, or object owner can delete"
on room_objects for delete
using (
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

create policy "author or moderator can soft-delete messages"
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
-- Deliberately no select policy for other roles/anon: invite validation
-- only happens through the join-room Edge Function via the service role.

alter table spotify_connections enable row level security;
-- Deliberately no policies at all: only Edge Functions (service role)
-- touch this table.
